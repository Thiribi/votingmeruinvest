// pm2 config for fansbench's own background processes. Scoped so a fansbench deploy
// can never collide with another site's process on this shared server: unique names,
// a dedicated port for the frontend (127.0.0.1:3010, not internet-facing), and memory
// caps since this box has 1GB RAM shared across multiple Laravel sites.
module.exports = {
  apps: [
    {
      name: "fansbench-frontend",
      script: "./production-server.mjs",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "250M",
      env: {
        NODE_ENV: "production",
        PORT: "3010",
        HOST: "127.0.0.1",
      },
    },
    {
      name: "fansbench-queue",
      script: "artisan",
      // Server has no bare `php` on PATH — release.sh calls php8.2 everywhere, match that.
      interpreter: "php8.2",
      // --sleep=1 keeps STK push latency low (checked against the frontend's 60s poll
      // window); --max-time recycles the worker hourly so pm2's autorestart clears any
      // slow memory growth from long-lived PHP workers, standard practice for queue:work.
      args: "queue:work --sleep=1 --tries=3 --max-time=3600",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "200M",
    },
  ],
};
