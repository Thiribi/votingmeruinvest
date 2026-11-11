import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessageSquareText, Plus, X, Trash2, Loader2, CheckCircle2, Circle } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { adminApi, ApiError, type SmsCredential } from "@/lib/api";

export const Route = createFileRoute("/admin/sms")({
  component: SmsCredentials,
});

function SmsCredentials() {
  const [rows, setRows] = useState<SmsCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<SmsCredential | null>(null);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | number | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  function load() {
    setLoading(true);
    adminApi.smsCredentials
      .list()
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }

  function toast(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(null), 2000);
  }

  async function toggleActive(row: SmsCredential) {
    setBusyId(row.id);
    try {
      if (row.is_active) await adminApi.smsCredentials.deactivate(row.id);
      else await adminApi.smsCredentials.activate(row.id);
      load();
      toast(row.is_active ? "Credential deactivated" : "Credential activated — the system will use it for new SMS");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't update that credential.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(row: SmsCredential) {
    if (!confirm(`Delete SMS credential "${row.label}"?`)) return;
    setBusyId(row.id);
    try {
      await adminApi.smsCredentials.remove(row.id);
      setRows((c) => c.filter((x) => x.id !== row.id));
      toast("Credential deleted");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't delete that credential.");
    } finally {
      setBusyId(null);
    }
  }

  async function save(form: { label: string; partner_id: string; api_key: string; shortcode: string }) {
    if (creating) {
      await adminApi.smsCredentials.create(form);
      toast("Credential added");
    } else if (editing) {
      const body: Partial<typeof form> = { ...form };
      if (!body.api_key) delete body.api_key;
      await adminApi.smsCredentials.update(editing.id, body);
      toast("Credential updated");
    }
    setEditing(null);
    setCreating(false);
    load();
  }

  return (
    <AdminLayout
      title="SMS Gateway (Advanta Africa)"
      actions={
        <button
          className="btn-primary"
          onClick={() => {
            setCreating(true);
            setEditing({ id: "new", label: "", partner_id: "", shortcode: "", is_active: false });
          }}
        >
          <Plus className="h-4 w-4" /> New credential
        </button>
      }
    >
      {flash && (
        <div className="mb-4 rounded-2xl border border-success bg-[color-mix(in_oklab,var(--success)_10%,transparent)] px-4 py-2.5 text-sm text-success">
          {flash}
        </div>
      )}
      <p className="mb-4 text-sm text-muted-foreground">
        Only one credential set can be active at a time — OTPs and other outbound SMS are sent using whichever one is active.
      </p>
      <div className="fb-card overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Label</th>
              <th className="px-4 py-3">Partner ID</th>
              <th className="px-4 py-3">Shortcode</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  No SMS credentials configured yet.
                </td>
              </tr>
            ) : (
              rows.map((c) => (
                <tr key={String(c.id)} className="hover:bg-surface-muted/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
                        <MessageSquareText className="h-4 w-4" />
                      </div>
                      <p className="font-semibold text-foreground">{c.label}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-foreground">{c.partner_id}</td>
                  <td className="px-4 py-3 text-foreground">{c.shortcode}</td>
                  <td className="px-4 py-3">
                    <button
                      disabled={busyId === c.id}
                      onClick={() => toggleActive(c)}
                      className={`chip ${
                        c.is_active
                          ? "!bg-[color-mix(in_oklab,var(--success)_15%,transparent)] !text-success"
                          : ""
                      }`}
                    >
                      {c.is_active ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <Circle className="h-3 w-3" />
                      )}
                      {c.is_active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex flex-wrap justify-end gap-2">
                      <button
                        className="btn-outline"
                        onClick={() => {
                          setCreating(false);
                          setEditing(c);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="btn-ghost text-destructive"
                        disabled={busyId === c.id}
                        onClick={() => remove(c)}
                        aria-label={`Delete ${c.label}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <CredentialModal
          initial={editing}
          creating={creating}
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

function CredentialModal({
  initial,
  creating,
  onClose,
  onSave,
}: {
  initial: SmsCredential;
  creating: boolean;
  onClose: () => void;
  onSave: (form: { label: string; partner_id: string; api_key: string; shortcode: string }) => Promise<void>;
}) {
  const [label, setLabel] = useState(initial.label);
  const [partnerId, setPartnerId] = useState(initial.partner_id);
  const [apiKey, setApiKey] = useState("");
  const [shortcode, setShortcode] = useState(initial.shortcode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-charcoal/50 p-4 backdrop-blur-sm">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!label.trim() || !partnerId.trim() || !shortcode.trim()) return;
          if (creating && !apiKey.trim()) {
            setError("API key is required.");
            return;
          }
          setError(null);
          setSaving(true);
          try {
            await onSave({ label: label.trim(), partner_id: partnerId.trim(), api_key: apiKey.trim(), shortcode: shortcode.trim() });
          } catch (err) {
            setError(err instanceof ApiError ? err.message : "Couldn't save this credential.");
          } finally {
            setSaving(false);
          }
        }}
        className="fb-card w-full max-w-lg p-7"
      >
        <div className="flex items-start justify-between">
          <h3 className="font-display text-xl font-bold text-foreground">
            {creating ? "New SMS credential" : `Edit ${initial.label}`}
          </h3>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-surface-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Label</label>
            <input
              className="fb-input"
              value={label}
              autoFocus
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Advanta production"
              required
              maxLength={255}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Partner ID</label>
            <input
              className="fb-input"
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
              required
              maxLength={255}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Shortcode</label>
            <input
              className="fb-input"
              value={shortcode}
              onChange={(e) => setShortcode(e.target.value)}
              required
              maxLength={255}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">API key</label>
            <input
              type="password"
              className="fb-input"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={creating ? "" : "Leave blank to keep the current key"}
              maxLength={255}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <div className="mt-7 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {creating ? "Create" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
