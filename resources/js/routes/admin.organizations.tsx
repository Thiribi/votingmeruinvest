import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, Plus, X, Loader2, Globe, Mail, Phone, User, ShieldCheck } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { organizationsApi, ApiError, type Organization } from "@/lib/api";
import {
  INDUSTRIES,
  OTHER_INDUSTRY,
  ORG_DESCRIPTION_MAX,
  normalizeWebsite,
  stripScheme,
  truncateWords,
} from "@/lib/org";

export const Route = createFileRoute("/admin/organizations")({
  component: Orgs,
});

type Row = {
  id: string | number;
  name: string;
  description?: string;
  industry: string;
  website?: string;
  status: "active" | "suspended" | "closed";
  active_campaigns: number;
  verified: boolean;
  contact_name?: string;
  contact_role?: string;
  contact_email?: string;
  contact_phone?: string;
};

const emptyRow: Row = {
  id: "new",
  name: "",
  description: "",
  industry: "",
  website: "",
  status: "active",
  active_campaigns: 0,
  verified: false,
  contact_name: "",
  contact_role: "",
  contact_email: "",
  contact_phone: "",
};

function Orgs() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<Row | null>(null);
  const [viewing, setViewing] = useState<Row | null>(null);
  const [confirmVerify, setConfirmVerify] = useState<Row | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    organizationsApi
      .list()
      .then((r) => {
        setRows(
          r.data.map((o: Organization) => ({
            id: o.id,
            name: o.name,
            description: o.description ?? "",
            industry: o.industry ?? "—",
            website: o.website ?? "",
            status: (o.status as Row["status"]) ?? "active",
            active_campaigns: o.active_campaigns ?? 0,
            verified: !!o.verified,
            contact_name: o.contact_name ?? "",
            contact_role: o.contact_role ?? "",
            contact_email: o.contact_email ?? "",
            contact_phone: o.contact_phone ?? "",
          })),
        );
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  async function toggleVerified(o: Row) {
    try {
      const updated = await organizationsApi.update(o.id, { verified: !o.verified });
      setRows((c) => c.map((x) => (x.id === o.id ? { ...x, verified: !!updated.verified } : x)));
      toast(updated.verified ? "Marked as verified" : "Marked as pending");
    } catch (e) {
      if (e instanceof ApiError) toast(e.message);
    }
  }

  function toast(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(null), 2000);
  }

  async function save(row: Row) {
    try {
      const created = await organizationsApi.create({
        name: row.name,
        description: row.description,
        industry: row.industry,
        website: row.website,
        status: row.status,
        verified: row.verified,
        contact_name: row.contact_name,
        contact_role: row.contact_role,
        contact_email: row.contact_email,
        contact_phone: row.contact_phone,
      });
      setRows((c) => [{ ...row, id: created.id }, ...c]);
    } catch (e) {
      setRows((c) => [row, ...c]);
      if (e instanceof ApiError && e.status >= 400 && e.status < 500) {
        toast(e.message);
        return;
      }
    }
    toast("Organization added");
    setCreating(null);
  }

  const statusChip = (s: Row["status"]) =>
    s === "active"
      ? "!bg-[color-mix(in_oklab,var(--success)_15%,transparent)] !text-success"
      : s === "suspended"
        ? "!bg-[color-mix(in_oklab,var(--warning)_20%,transparent)] !text-warning"
        : "!bg-[color-mix(in_oklab,var(--destructive)_15%,transparent)] !text-destructive";

  return (
    <AdminLayout
      title="Organizations"
      actions={
        <button className="btn-primary" onClick={() => setCreating({ ...emptyRow })}>
          <Plus className="h-4 w-4" /> Add organization
        </button>
      }
    >
      {flash && (
        <div className="mb-4 rounded-2xl border border-success bg-[color-mix(in_oklab,var(--success)_10%,transparent)] px-4 py-2.5 text-sm text-success">
          {flash}
        </div>
      )}
      {!loading && rows.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No organizations yet. Add one to get started.
        </p>
      )}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((o) => (
          <div key={String(o.id)} className="fb-card fb-card-hover p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl fb-gradient text-white">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-base font-bold text-foreground">
                  {o.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {o.industry}
                </p>
              </div>
              <span className={`chip ${statusChip(o.status)}`}>{o.status}</span>
            </div>
            {o.description && (
              <p className="mt-3 text-sm text-muted-foreground">
                {truncateWords(o.description, 10)}
              </p>
            )}
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {o.active_campaigns} active campaign{o.active_campaigns === 1 ? "" : "s"}
              </span>
              <span className={o.verified ? "text-success font-semibold" : ""}>
                {o.verified ? "Verified" : "Pending"}
              </span>
            </div>
            <div className="mt-5 flex gap-2">
              <button className="btn-outline flex-1" onClick={() => setViewing(o)}>
                View
              </button>
              <button className="btn-ghost" onClick={() => setConfirmVerify(o)}>
                {o.verified ? "Unverify" : "Verify"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {creating && (
        <OrgModal
          initial={creating}
          onClose={() => setCreating(null)}
          onSave={save}
        />
      )}
      {viewing && <ViewOrg org={viewing} onClose={() => setViewing(null)} />}
      {confirmVerify && (
        <VerifyConfirm
          org={confirmVerify}
          onClose={() => setConfirmVerify(null)}
          onConfirm={async () => {
            await toggleVerified(confirmVerify);
            setConfirmVerify(null);
          }}
        />
      )}
    </AdminLayout>
  );
}

function VerifyConfirm({
  org,
  onClose,
  onConfirm,
}: {
  org: Row;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const verifying = !org.verified;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-charcoal/50 p-4 backdrop-blur-sm">
      <div className="fb-card w-full max-w-md p-7">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
              verifying ? "bg-[color-mix(in_oklab,var(--success)_15%,transparent)] text-success" : "bg-surface-muted text-muted-foreground"
            }`}
          >
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h3 className="font-display text-lg font-bold text-foreground">
            {verifying ? "Verify organization?" : "Remove verification?"}
          </h3>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          {verifying ? (
            <>
              Mark <strong className="text-foreground">{org.name}</strong> as a verified
              organization. Verified organizations are shown a verification badge across
              FansBench.
            </>
          ) : (
            <>
              Remove the verified badge from <strong className="text-foreground">{org.name}</strong>?
              Fans will no longer see it as verified.
            </>
          )}
        </p>
        <div className="mt-7 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await onConfirm();
              setBusy(false);
            }}
            className="btn-primary"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {verifying ? "Verify" : "Unverify"}
          </button>
        </div>
      </div>
    </div>
  );
}

function OrgModal({
  initial,
  onClose,
  onSave,
}: {
  initial: Row;
  onClose: () => void;
  onSave: (r: Row) => Promise<void>;
}) {
  const [form, setForm] = useState<Row>(initial);
  const [saving, setSaving] = useState(false);
  // "Other" reveals a free-text industry; known values drive the dropdown directly.
  const [industryChoice, setIndustryChoice] = useState<string>(
    initial.industry && INDUSTRIES.includes(initial.industry as (typeof INDUSTRIES)[number])
      ? initial.industry
      : initial.industry
        ? OTHER_INDUSTRY
        : "",
  );
  const update = <K extends keyof Row>(k: K, v: Row[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-charcoal/50 p-4 backdrop-blur-sm">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!form.name.trim()) return;
          setSaving(true);
          await onSave({ ...form, website: normalizeWebsite(form.website ?? "") });
          setSaving(false);
        }}
        className="fb-card max-h-[92vh] w-full max-w-2xl overflow-y-auto p-7"
      >
        <div className="flex items-start justify-between">
          <h3 className="font-display text-xl font-bold">Add organization</h3>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-surface-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium">Name</label>
            <input
              className="fb-input"
              autoFocus
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Industry</label>
            <select
              className="fb-input"
              value={industryChoice}
              onChange={(e) => {
                const choice = e.target.value;
                setIndustryChoice(choice);
                update("industry", choice === OTHER_INDUSTRY ? "" : choice);
              }}
            >
              <option value="">Select industry</option>
              {INDUSTRIES.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
              <option value={OTHER_INDUSTRY}>{OTHER_INDUSTRY} (custom)…</option>
            </select>
            {industryChoice === OTHER_INDUSTRY && (
              <input
                className="fb-input mt-2"
                value={form.industry}
                onChange={(e) => update("industry", e.target.value)}
                placeholder="Enter industry"
                maxLength={255}
              />
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Status</label>
            <select
              className="fb-input"
              value={form.status}
              onChange={(e) => update("status", e.target.value as Row["status"])}
            >
              <option value="active">active</option>
              <option value="suspended">suspended</option>
              <option value="closed">closed</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium">
              Website <span className="text-muted-foreground">(optional)</span>
            </label>
            <div className="flex items-stretch overflow-hidden rounded-lg border border-border focus-within:ring-2 focus-within:ring-ring">
              <span className="flex items-center bg-surface-muted px-3 text-sm text-muted-foreground">
                https://
              </span>
              <input
                className="flex-1 bg-transparent px-3 py-2 text-sm outline-none"
                value={stripScheme(form.website ?? "")}
                onChange={(e) => update("website", stripScheme(e.target.value))}
                placeholder="example.com"
              />
            </div>
          </div>
          <div className="sm:col-span-2">
            <div className="mb-1.5 flex items-center justify-between">
              <label className="block text-sm font-medium">Description</label>
              <span
                className={`text-xs ${
                  (form.description?.length ?? 0) >= ORG_DESCRIPTION_MAX
                    ? "text-destructive"
                    : "text-muted-foreground"
                }`}
              >
                {form.description?.length ?? 0}/{ORG_DESCRIPTION_MAX}
              </span>
            </div>
            <textarea
              className="fb-input min-h-[96px] resize-y"
              value={form.description ?? ""}
              onChange={(e) => update("description", e.target.value.slice(0, ORG_DESCRIPTION_MAX))}
              maxLength={ORG_DESCRIPTION_MAX}
              placeholder="What the organization does and why it uses FansBench."
            />
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-surface-muted/60 p-4">
          <h4 className="font-display text-sm font-bold text-foreground">
            Primary contact person
          </h4>
          <p className="mt-0.5 text-xs text-muted-foreground">
            The point of contact for campaign administration and verification.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium">Full name</label>
              <input
                className="fb-input"
                value={form.contact_name ?? ""}
                onChange={(e) => update("contact_name", e.target.value)}
                placeholder="e.g. Jane Mwangi"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium">Role / title</label>
              <input
                className="fb-input"
                value={form.contact_role ?? ""}
                onChange={(e) => update("contact_role", e.target.value)}
                placeholder="e.g. HR Manager"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium">Email</label>
              <input
                type="email"
                className="fb-input"
                value={form.contact_email ?? ""}
                onChange={(e) => update("contact_email", e.target.value)}
                placeholder="contact@example.com"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium">Phone</label>
              <input
                className="fb-input"
                value={form.contact_phone ?? ""}
                onChange={(e) => update("contact_phone", e.target.value)}
                placeholder="+254…"
              />
            </div>
          </div>
        </div>

        <label className="mt-5 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.verified}
            onChange={(e) => update("verified", e.target.checked)}
          />
          Mark as verified
        </label>

        <div className="mt-7 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Create organization
          </button>
        </div>
      </form>
    </div>
  );
}

function ViewOrg({ org, onClose }: { org: Row; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-charcoal/50 p-4 backdrop-blur-sm">
      <div className="fb-card w-full max-w-lg p-7">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-display text-xl font-bold">{org.name}</h3>
            <p className="text-xs text-muted-foreground">
              {org.industry} · {org.status}
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-surface-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
        {org.description && (
          <p className="mt-4 text-sm text-foreground">{org.description}</p>
        )}
        {org.website && (
          <a
            href={org.website}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-electric hover:underline"
          >
            <Globe className="h-4 w-4" /> {org.website}
          </a>
        )}
        {(org.contact_name || org.contact_email || org.contact_phone) && (
          <div className="mt-5 rounded-2xl bg-surface-muted p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Contact person
            </p>
            <div className="mt-2 space-y-1.5 text-sm">
              {org.contact_name && (
                <p className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{org.contact_name}</span>
                  {org.contact_role && (
                    <span className="text-muted-foreground">· {org.contact_role}</span>
                  )}
                </p>
              )}
              {org.contact_email && (
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`mailto:${org.contact_email}`}
                    className="text-brand-electric hover:underline"
                  >
                    {org.contact_email}
                  </a>
                </p>
              )}
              {org.contact_phone && (
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{org.contact_phone}</span>
                </p>
              )}
            </div>
          </div>
        )}
        <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-xs uppercase text-muted-foreground">
              Active campaigns
            </dt>
            <dd className="mt-1 font-display text-lg font-bold">
              {org.active_campaigns}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-muted-foreground">Verified</dt>
            <dd className="mt-1 font-display text-lg font-bold">
              {org.verified ? "Yes" : "Pending"}
            </dd>
          </div>
        </dl>
        <div className="mt-7 flex justify-end">
          <button onClick={onClose} className="btn-primary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
