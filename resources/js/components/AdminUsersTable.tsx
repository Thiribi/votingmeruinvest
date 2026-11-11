import { useEffect, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Search,
  ShieldCheck,
  Trash2,
  UserCog,
  X,
  XCircle,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { RowActionsMenu, type RowAction } from "@/components/RowActionsMenu";
import { adminApi, ApiError, type User, type Role } from "@/lib/api";

type Filter = "all" | "pending_deletion" | "archived";

export function AdminUsersTable({
  classification,
  title,
  addLabel,
  roleOptions,
  defaultRole,
}: {
  classification: "fan" | "staff";
  title: string;
  addLabel: string;
  /** Roles selectable when adding someone from this page (Fans only ever creates "fan"). */
  roleOptions: User["role"][];
  defaultRole: User["role"];
}) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [managing, setManaging] = useState<User | null>(null);
  const [editing, setEditing] = useState<User | null>(null);
  const [inviting, setInviting] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<User | null>(null);
  const [busyId, setBusyId] = useState<User["id"] | null>(null);
  const filtered = users.filter(
    (u) => u.name.toLowerCase().includes(q.toLowerCase()) || u.email.includes(q),
  );

  function toast(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(null), 2000);
  }

  function load() {
    setLoading(true);
    Promise.all([
      adminApi.users.list({
        classification,
        with_archived: filter !== "all",
        archived: filter === "archived",
        pending_deletion: filter === "pending_deletion",
      }),
      adminApi.roles.list(),
    ])
      .then(([u, r]) => {
        setUsers(u.data);
        setRoles(r);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, classification]);

  function patch(u: User) {
    setUsers((c) => c.map((x) => (x.id === u.id ? u : x)));
  }

  async function run(user: User, label: string, action: () => Promise<User>) {
    setBusyId(user.id);
    try {
      const updated = await action();
      patch(updated);
      toast(label);
    } catch (e) {
      if (e instanceof ApiError) toast(e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function resetPassword(user: User) {
    setBusyId(user.id);
    try {
      await adminApi.users.resetPassword(user.id);
      toast(`Password reset link sent to ${user.email}`);
    } catch (e) {
      if (e instanceof ApiError) toast(e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function remove(user: User) {
    setBusyId(user.id);
    try {
      await adminApi.users.remove(user.id);
      setUsers((c) => c.filter((x) => x.id !== user.id));
      toast(`${user.name} deleted`);
    } catch (e) {
      if (e instanceof ApiError) toast(e.message);
    } finally {
      setBusyId(null);
      setRemoveTarget(null);
    }
  }

  return (
    <>
      {flash && (
        <div className="mb-4 rounded-md border border-success bg-[color-mix(in_oklab,var(--success)_10%,transparent)] px-3 py-2 text-sm text-success">
          {flash}
        </div>
      )}

      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex gap-2">
          {(
            [
              { key: "all", label: "All" },
              { key: "pending_deletion", label: "Pending deletion" },
              { key: "archived", label: classification === "fan" ? "Archived (deleted) fans" : "Archived" },
            ] as { key: Filter; label: string }[]
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`chip ${filter === tab.key ? "!bg-primary !text-primary-foreground" : ""}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button className="btn-primary" onClick={() => setInviting(true)}>
          <ShieldCheck className="h-4 w-4" /> {addLabel}
        </button>
      </div>

      <div className="fb-card">
        <div className="flex items-center gap-3 border-b border-border p-4">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`Search ${title.toLowerCase()}…`}
              className="fb-input pl-9"
            />
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">User</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Assigned roles</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((u) => {
                  const archived = Boolean(u.archived_at);
                  const suspended = Boolean(u.suspended_at);
                  const pendingDeletion = Boolean(u.deletion_requested_at) && !archived;
                  const busy = busyId === u.id;
                  return (
                    <tr key={String(u.id)} className={`hover:bg-surface-muted/50 ${archived ? "opacity-60" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-primary">
                            {u.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{u.name}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="chip capitalize">{u.role}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(u.roles ?? []).length > 0
                            ? u.roles!.map((r) => (
                                <span key={r} className="chip text-[11px]">
                                  {r}
                                </span>
                              ))
                            : <span className="text-xs text-muted-foreground">None</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {archived && (
                            <span className="chip !bg-[color-mix(in_oklab,var(--destructive)_15%,transparent)] !text-destructive">
                              archived
                            </span>
                          )}
                          {suspended && !archived && (
                            <span className="chip !bg-[color-mix(in_oklab,var(--destructive)_15%,transparent)] !text-destructive">
                              suspended
                            </span>
                          )}
                          {pendingDeletion && (
                            <span className="chip !bg-[color-mix(in_oklab,var(--accent)_15%,transparent)] !text-accent">
                              deletion requested
                            </span>
                          )}
                          {!archived && !suspended && !pendingDeletion && (
                            <span className="text-xs text-muted-foreground">active</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {busy ? (
                          <Loader2 className="ml-auto h-4 w-4 animate-spin text-muted-foreground" />
                        ) : (
                          <RowActionsMenu
                            label={u.name}
                            actions={
                              [
                                { kind: "button", label: "Edit", icon: Pencil, onSelect: () => setEditing(u) },
                                { kind: "button", label: "Manage roles", icon: UserCog, onSelect: () => setManaging(u) },
                                {
                                  kind: "button",
                                  label: "Send password reset",
                                  icon: KeyRound,
                                  onSelect: () => resetPassword(u),
                                },
                                { kind: "separator" },
                                {
                                  kind: "button",
                                  label: suspended ? "Reactivate" : "Suspend",
                                  icon: suspended ? Power : PowerOff,
                                  onSelect: () =>
                                    run(u, suspended ? `${u.name} reactivated` : `${u.name} suspended`, () =>
                                      suspended ? adminApi.users.activate(u.id) : adminApi.users.suspend(u.id),
                                    ),
                                },
                                ...(pendingDeletion
                                  ? ([
                                      {
                                        kind: "button",
                                        label: "Dismiss deletion request",
                                        icon: XCircle,
                                        onSelect: () =>
                                          run(u, "Deletion request dismissed", () =>
                                            adminApi.users.dismissDeletionRequest(u.id),
                                          ),
                                      },
                                    ] as RowAction[])
                                  : []),
                                { kind: "separator" },
                                {
                                  kind: "button",
                                  label: archived ? "Restore account" : "Archive (soft-delete)",
                                  icon: archived ? ArchiveRestore : Archive,
                                  onSelect: () =>
                                    run(u, archived ? `${u.name} restored` : `${u.name} archived`, () =>
                                      archived ? adminApi.users.unarchive(u.id) : adminApi.users.archive(u.id),
                                    ),
                                },
                                {
                                  kind: "button",
                                  label: "Delete permanently",
                                  icon: Trash2,
                                  destructive: true,
                                  onSelect: () => setRemoveTarget(u),
                                },
                              ] satisfies RowAction[]
                            }
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No {title.toLowerCase()} found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <EditUserModal
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={(u) => {
            patch(u);
            setEditing(null);
            toast("Details updated");
          }}
        />
      )}

      {managing && (
        <PermissionsModal
          user={managing}
          allRoles={roles}
          onClose={() => setManaging(null)}
          onSaved={(u) => {
            patch(u);
            setManaging(null);
            toast("User updated");
          }}
        />
      )}
      {inviting && (
        <InviteAdminModal
          roleOptions={roleOptions}
          defaultRole={defaultRole}
          onClose={() => setInviting(false)}
          onInvited={(u) => {
            setUsers((c) => [u, ...c]);
            setInviting(false);
            toast(`Invite sent to ${u.email}`);
          }}
        />
      )}

      <ConfirmDialog
        open={removeTarget !== null}
        onOpenChange={(o) => !o && busyId === null && setRemoveTarget(null)}
        title={`Permanently delete ${removeTarget?.name}?`}
        description="This hard-deletes the account and cannot be undone. Consider Archive instead if you might need to restore it."
        confirmLabel="Delete permanently"
        destructive
        loading={busyId === removeTarget?.id}
        onConfirm={() => removeTarget && remove(removeTarget)}
      />
    </>
  );
}

function EditUserModal({
  user,
  onClose,
  onSaved,
}: {
  user: User;
  onClose: () => void;
  onSaved: (u: User) => void;
}) {
  const [firstName, setFirstName] = useState(user.first_name ?? "");
  const [lastName, setLastName] = useState(user.last_name ?? "");
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const updated = await adminApi.users.update(user.id, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
      });
      onSaved(updated);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={save} className="fb-card w-full max-w-md p-6">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold text-foreground">Edit {user.name}</h3>
          <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-surface-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">First name</label>
              <input className="fb-input" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Last name</label>
              <input className="fb-input" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Email</label>
            <input type="email" className="fb-input" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Phone</label>
            <input className="fb-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+254 7XX XXX XXX" />
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save changes
          </button>
        </div>
      </form>
    </div>
  );
}

function PermissionsModal({
  user,
  allRoles,
  onClose,
  onSaved,
}: {
  user: User;
  allRoles: Role[];
  onClose: () => void;
  onSaved: (u: User) => void;
}) {
  const [role, setRole] = useState<User["role"]>(user.role);
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set(user.roles ?? []));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ROLE_OPTIONS: User["role"][] = ["fan", "moderator", "organizer", "admin"];

  async function save() {
    setSaving(true);
    setError(null);
    try {
      let updated = user;
      if (role !== user.role) {
        updated = await adminApi.users.setRole(user.id, role);
      }
      updated = await adminApi.users.setRoles(user.id, Array.from(selectedRoles));
      onSaved(updated);
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="fb-card w-full max-w-lg p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Manage {user.name}</h3>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-surface-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5">
          <label className="mb-1.5 block text-sm font-medium">Base role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as User["role"])}
            className="fb-input capitalize"
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r} className="capitalize">
                {r}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">
            "admin" always has full access. Other users only get what their assigned roles below grant.
          </p>
        </div>

        <div className="mt-5">
          <p className="mb-2 text-sm font-medium">Assigned roles</p>
          {allRoles.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No custom roles yet — create one from Roles &amp; Permissions.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {allRoles.map((r) => {
                const checked = selectedRoles.has(r.name);
                return (
                  <label
                    key={String(r.id)}
                    className={`flex cursor-pointer items-center gap-2 rounded-md border p-2 text-xs ${
                      checked ? "border-primary bg-secondary" : "border-border"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setSelectedRoles((cur) => {
                          const n = new Set(cur);
                          e.target.checked ? n.add(r.name) : n.delete(r.name);
                          return n;
                        })
                      }
                    />
                    <span>{r.name}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button onClick={save} disabled={saving} className="btn-primary">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}

function InviteAdminModal({
  roleOptions,
  defaultRole,
  onClose,
  onInvited,
}: {
  roleOptions: User["role"][];
  defaultRole: User["role"];
  onClose: () => void;
  onInvited: (u: User) => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<User["role"]>(defaultRole);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roleLabel: Record<User["role"], string> = {
    fan: "Fan",
    moderator: "Moderator",
    organizer: "Organizer",
    admin: "Admin",
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const invited = await adminApi.users.invite({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        role,
      });
      onInvited(invited);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={submit} className="fb-card w-full max-w-md p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">Add {roleLabel[defaultRole].toLowerCase()}</h3>
            <p className="text-xs text-muted-foreground">They'll get an email to set their password.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 hover:bg-surface-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">First name</label>
              <input
                className="fb-input"
                autoFocus
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Last name</label>
              <input
                className="fb-input"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Email</label>
            <input
              type="email"
              className="fb-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {roleOptions.length > 1 && (
            <div>
              <label className="mb-1.5 block text-sm font-medium">Role</label>
              <select
                className="fb-input capitalize"
                value={role}
                onChange={(e) => setRole(e.target.value as User["role"])}
              >
                {roleOptions.map((r) => (
                  <option key={r} value={r}>
                    {roleLabel[r]}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {defaultRole === "fan" ? "Create fan account" : "Send invite"}
          </button>
        </div>
      </form>
    </div>
  );
}
