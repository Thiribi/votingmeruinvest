import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, Plus, X, Trash2, Loader2 } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { adminApi, ApiError, type Role, type Permission } from "@/lib/api";

export const Route = createFileRoute("/admin/roles")({
  component: RolesPage,
});

function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Role | null>(null);
  const [creating, setCreating] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  function toast(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(null), 2000);
  }

  function load() {
    setLoading(true);
    Promise.all([adminApi.roles.list(), adminApi.permissions.list()])
      .then(([r, p]) => {
        setRoles(r);
        setPermissions(p);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function save(role: Role) {
    try {
      if (creating) {
        await adminApi.roles.create({
          name: role.name,
          description: role.description ?? undefined,
          permissions: role.permissions.map((p) => p.name),
        });
      } else {
        await adminApi.roles.update(role.id, {
          name: role.name,
          description: role.description ?? undefined,
          permissions: role.permissions.map((p) => p.name),
        });
      }
      toast(creating ? "Role created" : "Role updated");
      load();
    } catch (e) {
      if (e instanceof ApiError) {
        toast(e.message);
        return;
      }
    }
    setEditing(null);
    setCreating(false);
  }

  async function remove(role: Role) {
    if (!confirm(`Delete role "${role.name}"? Users assigned to it will lose its permissions.`)) return;
    try {
      await adminApi.roles.remove(role.id);
      setRoles((r) => r.filter((x) => x.id !== role.id));
      toast("Role deleted");
    } catch (e) {
      if (e instanceof ApiError) toast(e.message);
    }
  }

  return (
    <AdminLayout
      title="Roles & Permissions"
      actions={
        <button
          className="btn-primary"
          onClick={() => {
            setCreating(true);
            setEditing({ id: "new", name: "", description: "", permissions: [] });
          }}
        >
          <Plus className="h-4 w-4" /> New role
        </button>
      }
    >
      {flash && (
        <div className="mb-4 rounded-2xl border border-success bg-[color-mix(in_oklab,var(--success)_10%,transparent)] px-4 py-2.5 text-sm text-success">
          {flash}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => (
            <div key={String(role.id)} className="fb-card p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{role.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {role.users_count ?? 0} user{role.users_count === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
              </div>
              {role.description && (
                <p className="mt-3 text-xs text-muted-foreground">{role.description}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {role.permissions.map((p) => (
                  <span key={String(p.id)} className="chip font-mono text-[10px]">
                    {p.name}
                  </span>
                ))}
                {role.permissions.length === 0 && (
                  <span className="text-xs text-muted-foreground">No permissions assigned</span>
                )}
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  className="btn-outline"
                  onClick={() => {
                    setCreating(false);
                    setEditing(role);
                  }}
                >
                  Edit
                </button>
                <button
                  className="btn-ghost text-destructive"
                  onClick={() => remove(role)}
                  aria-label={`Delete ${role.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {roles.length === 0 && (
            <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
              No roles yet. Create one to grant scoped admin access.
            </p>
          )}
        </div>
      )}

      {editing && (
        <RoleModal
          initial={editing}
          creating={creating}
          allPermissions={permissions}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSave={save}
        />
      )}
    </AdminLayout>
  );
}

function RoleModal({
  initial,
  creating,
  allPermissions,
  onClose,
  onSave,
}: {
  initial: Role;
  creating: boolean;
  allPermissions: Permission[];
  onClose: () => void;
  onSave: (r: Role) => Promise<void>;
}) {
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description ?? "");
  const [selected, setSelected] = useState<Set<string>>(
    new Set(initial.permissions.map((p) => p.name)),
  );
  const [saving, setSaving] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-charcoal/50 p-4 backdrop-blur-sm">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim()) return;
          setSaving(true);
          await onSave({
            ...initial,
            name: name.trim(),
            description: description.trim(),
            permissions: allPermissions.filter((p) => selected.has(p.name)),
          });
          setSaving(false);
        }}
        className="fb-card w-full max-w-lg p-7"
      >
        <div className="flex items-start justify-between">
          <h3 className="font-display text-xl font-bold text-foreground">
            {creating ? "New role" : `Edit ${initial.name}`}
          </h3>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-surface-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Name</label>
            <input
              className="fb-input"
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={80}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Description</label>
            <textarea
              className="fb-input min-h-[72px] resize-y"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              placeholder="What this role is for"
            />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Permissions</p>
            <div className="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
              {allPermissions.map((p) => {
                const checked = selected.has(p.name);
                return (
                  <label
                    key={String(p.id)}
                    className={`flex cursor-pointer items-start gap-2 rounded-md border p-2 text-xs ${
                      checked ? "border-primary bg-secondary" : "border-border"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={checked}
                      onChange={(e) =>
                        setSelected((cur) => {
                          const n = new Set(cur);
                          e.target.checked ? n.add(p.name) : n.delete(p.name);
                          return n;
                        })
                      }
                    />
                    <span>
                      <span className="block font-mono">{p.name}</span>
                      {p.description && (
                        <span className="block text-muted-foreground">{p.description}</span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
        <div className="mt-7 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {creating ? "Create role" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
