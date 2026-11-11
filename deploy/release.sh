#!/usr/bin/env bash
# Activates a release that has already been rsynced into
# $DEPLOY_PATH/releases/$RELEASE_ID. Run on the server by .github/workflows/deploy.yml.
#
# Usage: release.sh <RELEASE_ID>
# Requires DEPLOY_PATH in the environment.
#
# IMPORTANT: node_modules and dist/ in a release are built once, together, by CI
# (see "Build optimized frontend bundle" in deploy.yml) and rsynced here as a matched
# pair. Never run `npm install`/`npm ci` by hand against a release directory on this
# server — that was done once during an incident and immediately desynced node_modules
# from the dist/server/server.js bundle CI had built, crashing the frontend with a
# "does not provide an export" error. If the frontend is broken, fix it by shipping a
# new release, not by patching this directory in place.

set -euo pipefail

RELEASE_ID="${1:?Usage: release.sh <RELEASE_ID>}"
DEPLOY_PATH="${DEPLOY_PATH:?DEPLOY_PATH must be set}"

RELEASE_DIR="$DEPLOY_PATH/releases/$RELEASE_ID"
SHARED_DIR="$DEPLOY_PATH/shared"

echo "==> Activating release $RELEASE_ID"

if [ ! -d "$RELEASE_DIR" ]; then
  echo "ERROR: release directory not found: $RELEASE_DIR" >&2
  exit 1
fi

# 1. Persistent shared storage dirs (created once, never reset by a deploy)
echo "==> Creating shared storage directories..."
mkdir -p \
  "$SHARED_DIR/storage/app/public" \
  "$SHARED_DIR/storage/framework/cache/data" \
  "$SHARED_DIR/storage/framework/sessions" \
  "$SHARED_DIR/storage/framework/views" \
  "$SHARED_DIR/storage/framework/testing" \
  "$SHARED_DIR/storage/logs" \
  "$SHARED_DIR/storage/fonts"

if [ ! -f "$SHARED_DIR/.env" ]; then
  echo "ERROR: $SHARED_DIR/.env is missing — deploy cannot continue without production config" >&2
  exit 1
fi

# 2. Link the release to the persistent .env
echo "==> Symlinking .env..."
ln -sfn "$SHARED_DIR/.env" "$RELEASE_DIR/.env"

# 3-4. Link the release to persistent storage
echo "==> Symlinking storage..."
rm -rf "$RELEASE_DIR/storage"
ln -sfn "$SHARED_DIR/storage" "$RELEASE_DIR/storage"

cd "$RELEASE_DIR"

# 5. Verify this release is actually deployable before touching anything live —
# a release that fails these checks must never reach the symlink swap or pm2.
echo "==> Verifying frontend build artifacts..."
if [ ! -f "$RELEASE_DIR/dist/server/server.js" ] || [ ! -d "$RELEASE_DIR/dist/client" ]; then
  echo "ERROR: frontend build is missing from this release (dist/server/server.js or dist/client not found)." >&2
  echo "This release was not assembled correctly by CI — aborting before touching the live site." >&2
  exit 1
fi

if [ ! -d "$RELEASE_DIR/node_modules/@tanstack" ]; then
  echo "ERROR: node_modules is missing or incomplete in this release — aborting." >&2
  exit 1
fi

NODE_MAJOR="$(node -e "process.stdout.write(process.versions.node.split('.')[0])")"
if [ "$NODE_MAJOR" -lt 22 ]; then
  echo "ERROR: server Node.js is $(node -v), but the frontend bundle requires Node >=22.12 (see package.json engines)." >&2
  echo "Upgrade Node on this server — do not work around this by npm-installing against an older runtime." >&2
  exit 1
fi

# 6. Install PHP dependencies
echo "==> Installing PHP dependencies"
composer install --no-dev --optimize-autoloader --no-interaction

# public/ is fresh per release (not shared/symlinked like storage/ is), so the
# public/storage -> storage/app/public symlink has to be recreated on every single deploy,
# not just once — without it, every uploaded file (category/nominee icons, org logos) 404s
# even though the underlying file is sitting right there in shared storage. --force makes
# this safe to re-run even if a stray public/storage already exists from something else.
echo "==> Linking public/storage..."
php8.2 artisan storage:link --force

# 7-11. Migrate and warm caches before this release goes live
echo "==> Running migrations..."
php8.2 artisan migrate --force

echo "==> Caching configuration..."
php8.2 artisan config:cache

echo "==> Caching routes..."
php8.2 artisan route:cache

echo "==> Caching views..."
php8.2 artisan view:cache

echo "==> Caching events..."
php8.2 artisan event:cache

# 12. Start/reload the frontend + queue worker for THIS release and confirm they
# actually come up before we swap traffic over — ecosystem.config.cjs resolves its
# `cwd` from its own location (this release dir), so pm2 always points at the new
# code regardless of where the `current` symlink is pointing yet.
echo "==> Managing pm2 processes (ecosystem.config.cjs)..."
pm2 startOrReload "$RELEASE_DIR/ecosystem.config.cjs" --update-env

echo "==> Waiting for pm2 processes to report online..."
ALL_ONLINE=0
for attempt in $(seq 1 15); do
  ALL_ONLINE=1
  for proc in fansbench-frontend fansbench-queue; do
    if ! sudo -u deploy pm2 describe "$proc" 2>/dev/null | grep -q "status.*online"; then
      ALL_ONLINE=0
    fi
  done
  if [ "$ALL_ONLINE" -eq 1 ]; then
    break
  fi
  sleep 2
done

sudo -u deploy pm2 list 2>/dev/null || true

if [ "$ALL_ONLINE" -ne 1 ]; then
  echo "ERROR: one or more pm2 processes failed to come online for release $RELEASE_ID:" >&2
  for proc in fansbench-frontend fansbench-queue; do
    echo "----- pm2 logs for $proc (last 30 lines) -----" >&2
    sudo -u deploy pm2 logs "$proc" --lines 30 --nostream 2>&1 >&2 || true
  done
  echo "Aborting before swapping 'current' or pruning old releases — the previous release's" >&2
  echo "pm2 processes have already been replaced by this attempt, though, so the frontend" >&2
  echo "is down; redeploy a fixed release immediately." >&2
  exit 1
fi

for proc in fansbench-frontend fansbench-queue; do
  echo "  ✓ $proc is online"
done

# Persist the process list so pm2 resurrects both on server reboot
sudo -u deploy pm2 save

# 13. Atomic symlink swap — only reached once pm2 has confirmed the new release's
# frontend and queue worker are healthy.
echo "==> Swapping symlink..."
ln -sfn "$DEPLOY_PATH/releases/$RELEASE_ID" "$DEPLOY_PATH/current"

# 14. Zero-downtime reload PHP-FPM
echo "==> Reloading PHP-FPM..."
sudo systemctl reload php8.2-fpm || true

# 14b. Enforce the canonical nginx config (production only — set by deploy-prod.yml,
# never by deploy.yml, so staging's own separate nginx config is never touched by this).
# nginx config lives outside git and the deploy pipeline by nature (it's server state,
# not application code), which is exactly how it silently drifted before: someone edited
# /etc/nginx/sites-available/fansbench.com directly, removing the direct proxy to the
# Node frontend, and nothing caught it until real traffic broke. Re-applying the
# version-controlled copy on every deploy makes that class of drift impossible going
# forward — if nginx -t rejects it, we stop before reloading rather than leave nginx in a
# broken state, but we don't fail the whole deploy over it: the release itself (PHP, pm2)
# is already live and correct by this point.
if [ "${ENFORCE_NGINX_CONFIG:-0}" = "1" ]; then
  echo "==> Enforcing canonical nginx config..."
  NGINX_SRC="$RELEASE_DIR/deploy/nginx-fansbench.com.conf"
  NGINX_DEST="/etc/nginx/sites-available/fansbench.com"

  if [ ! -f "$NGINX_SRC" ]; then
    echo "WARNING: $NGINX_SRC not found in this release — skipping nginx enforcement." >&2
  else
    sudo cp "$NGINX_SRC" "$NGINX_DEST"
    sudo ln -sf "$NGINX_DEST" /etc/nginx/sites-enabled/fansbench.com

    if sudo nginx -t; then
      sudo systemctl reload nginx
      echo "  ✓ nginx config enforced and reloaded"
    else
      echo "WARNING: nginx -t rejected the enforced config — left un-reloaded, nginx is still" >&2
      echo "running its previous configuration. Fix deploy/nginx-fansbench.com.conf and redeploy." >&2
    fi
  fi
fi

# 15. Signal the queue worker to reload so it runs this release's code
echo "==> Restarting queue workers..."
php8.2 artisan queue:restart 2>/dev/null || true

# 16. Keep the 5 most recent releases, prune the rest
echo "==> Pruning old releases..."
cd "$DEPLOY_PATH/releases"
ls -1t | tail -n +6 | xargs -r rm -rf 2>/dev/null || true

echo "Releases retained:"
ls -1dt */ | head -n 5 | sed 's:/$::'

echo "✓ Release $RELEASE_ID is now live"
