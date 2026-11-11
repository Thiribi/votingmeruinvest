import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2, Copy, Link as LinkIcon, Loader2, Upload, Mail, Download, X } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { campaignsApi, organizationsApi, ApiError, type Organization } from "@/lib/api";

export const Route = createFileRoute("/admin/campaigns")({
  component: CampaignBuilder,
});

type Option = { id: string; label: string; description: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function downloadText(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Mail-merge CSV of each recipient and their unique single-use link. */
function invitesToCsv(invites: { email: string; invite_url: string }[]): string {
  const rows = invites.map((i) => `"${i.email}","${i.invite_url}"`);
  return ["email,invite_url", ...rows].join("\r\n");
}

/** Ready-to-send email template, one block per recipient with their personal link. */
function invitesToEmailTemplate(
  invites: { email: string; invite_url: string }[],
  title: string,
  org: string,
): string {
  const subject = `Your FansBench voting invite${title ? ` — ${title}` : ""}`;
  return invites
    .map(
      (i) =>
        `To: ${i.email}\n` +
        `Subject: ${subject}\n\n` +
        `Hi,\n\n` +
        `You've been invited${org ? ` by ${org}` : ""} to cast a verified vote` +
        `${title ? ` in "${title}"` : ""} on FansBench.\n\n` +
        `Your unique, single-use voting link:\n${i.invite_url}\n\n` +
        `This link works only once and only for you — please don't share it.\n\n` +
        `Thank you,\n${org || "FansBench"}\n` +
        `\n----------------------------------------\n`,
    )
    .join("\n");
}

function CampaignBuilder() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [orgId, setOrgId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [closes, setCloses] = useState("");
  const [options, setOptions] = useState<Option[]>([
    { id: crypto.randomUUID(), label: "", description: "" },
    { id: crypto.randomUUID(), label: "", description: "" },
  ]);
  const [feedbackOptions, setFeedbackOptions] = useState<string[]>([]);
  const [feedbackInput, setFeedbackInput] = useState("");
  const [allowedEmails, setAllowedEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [uploadName, setUploadName] = useState<string | null>(null);
  const [invites, setInvites] = useState<{ email: string; invite_url: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local "now" in the format datetime-local inputs expect, used to disable past start dates.
  const nowLocal = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  useEffect(() => {
    organizationsApi
      .list()
      .then((r) => {
        setOrganizations(r.data);
        if (r.data.length) setOrgId(String(r.data[0].id));
      })
      .catch(() => setOrganizations([]));
  }, []);

  const org = organizations.find((o) => String(o.id) === orgId)?.name ?? "";

  function addOption() {
    setOptions((c) => [
      ...c,
      { id: crypto.randomUUID(), label: "", description: "" },
    ]);
  }

  function parseEmails(text: string): string[] {
    return Array.from(
      new Set(
        text
          .split(/[\s,;]+/)
          .map((s) => s.trim().toLowerCase())
          .filter((s) => EMAIL_RE.test(s)),
      ),
    );
  }

  function addEmails(text: string) {
    const found = parseEmails(text);
    if (!found.length) return;
    setAllowedEmails((prev) => Array.from(new Set([...prev, ...found])));
  }

  async function handleFile(file: File) {
    setUploadName(file.name);
    const text = await file.text();
    addEmails(text);
  }

  async function generate() {
    setError(null);
    if (startsAt && startsAt < nowLocal) {
      setError("The start date can't be in the past.");
      return;
    }
    if (closes && startsAt && closes < startsAt) {
      setError("The end date must be after the start date.");
      return;
    }
    setSaving(true);
    try {
      const campaign = await campaignsApi.create({
        title,
        organization_id: orgId || undefined,
        category,
        visibility: "private",
        starts_at: startsAt || undefined,
        closes_at: closes || undefined,
        feedback_options: feedbackOptions.length ? feedbackOptions : undefined,
        allowed_emails: allowedEmails,
        options: options.map((o) => ({ label: o.label, description: o.description })),
      } as Parameters<typeof campaignsApi.create>[0]);
      // Prefer the full per-recipient list; fall back to a single generated link.
      if (campaign.invites && campaign.invites.length > 0) {
        setInvites(campaign.invites);
      } else {
        const invite = campaign.invite_url
          ? campaign.invite_url
          : (await campaignsApi.generateInvite(campaign.id)).invite_url;
        setInvites([{ email: allowedEmails[0] ?? "invite", invite_url: invite }]);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Couldn't reach the server. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout title="Campaign Builder">
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="fb-card p-7">
          <h2 className="font-display text-xl font-bold text-foreground">
            Create private organization campaign
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure a token-gated poll for internal employees. Access only via
            secure invite link and allow-listed emails.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Organization
              </label>
              <select
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                className="fb-input"
              >
                {organizations.length === 0 && <option value="">No organizations yet</option>}
                {organizations.map((o) => (
                  <option key={String(o.id)} value={String(o.id)}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Custom category
              </label>
              <input
                className="fb-input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. End of Year Party Venue"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium">
                Campaign title
              </label>
              <input
                className="fb-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Start date
              </label>
              <input
                type="datetime-local"
                className="fb-input"
                min={nowLocal}
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                End date
              </label>
              <input
                type="datetime-local"
                className="fb-input"
                min={startsAt || nowLocal}
                value={closes}
                onChange={(e) => setCloses(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <p className="font-display text-sm font-bold">Polling options</p>
              <button onClick={addOption} className="btn-outline">
                <Plus className="h-4 w-4" /> Add option
              </button>
            </div>
            <div className="mt-3 space-y-3">
              {options.map((o, i) => (
                <div key={o.id} className="fb-card p-3">
                  <div className="flex items-start gap-3">
                    <span className="mt-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-primary">
                      {i + 1}
                    </span>
                    <div className="grid flex-1 gap-2">
                      <input
                        className="fb-input"
                        placeholder="Option label"
                        value={o.label}
                        onChange={(e) =>
                          setOptions((c) =>
                            c.map((x) =>
                              x.id === o.id ? { ...x, label: e.target.value } : x,
                            ),
                          )
                        }
                      />
                      <input
                        className="fb-input"
                        placeholder="Short description (optional)"
                        value={o.description}
                        onChange={(e) =>
                          setOptions((c) =>
                            c.map((x) =>
                              x.id === o.id
                                ? { ...x, description: e.target.value }
                                : x,
                            ),
                          )
                        }
                      />
                    </div>
                    <button
                      onClick={() =>
                        setOptions((c) => c.filter((x) => x.id !== o.id))
                      }
                      className="rounded-full p-2 text-muted-foreground hover:bg-surface-muted hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <p className="font-display text-sm font-bold">Feedback prompts (optional)</p>
            <p className="text-xs text-muted-foreground">
              Preset comments voters can pick after voting. They can also write their own.
              Feedback is tagged with the voter's exact geo-location.
            </p>
            <div className="mt-3 flex gap-2">
              <input
                className="fb-input"
                placeholder="e.g. Great venue choice"
                value={feedbackInput}
                maxLength={120}
                onChange={(e) => setFeedbackInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const v = feedbackInput.trim();
                    if (v && feedbackOptions.length < 10 && !feedbackOptions.includes(v)) {
                      setFeedbackOptions((c) => [...c, v]);
                    }
                    setFeedbackInput("");
                  }
                }}
              />
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  const v = feedbackInput.trim();
                  if (v && feedbackOptions.length < 10 && !feedbackOptions.includes(v)) {
                    setFeedbackOptions((c) => [...c, v]);
                  }
                  setFeedbackInput("");
                }}
              >
                Add
              </button>
            </div>
            {feedbackOptions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {feedbackOptions.map((opt) => (
                  <span
                    key={opt}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-muted px-3 py-1 text-xs font-medium"
                  >
                    {opt}
                    <button
                      type="button"
                      onClick={() => setFeedbackOptions((c) => c.filter((x) => x !== opt))}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${opt}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display text-sm font-bold">
                  Allowed voter emails
                </p>
                <p className="text-xs text-muted-foreground">
                  Only these employees can redeem the invite. Upload a CSV/TXT
                  or paste them below.
                </p>
              </div>
              <label className="btn-outline cursor-pointer">
                <Upload className="h-4 w-4" /> Upload
                <input
                  type="file"
                  accept=".csv,.txt,text/csv,text/plain"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>

            <div className="mt-3 flex gap-2">
              <input
                className="fb-input"
                placeholder="Paste emails separated by comma, space or newline"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addEmails(emailInput);
                    setEmailInput("");
                  }
                }}
              />
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  addEmails(emailInput);
                  setEmailInput("");
                }}
              >
                Add
              </button>
            </div>

            {uploadName && (
              <p className="mt-2 text-xs text-muted-foreground">
                Imported from <span className="font-medium">{uploadName}</span>
              </p>
            )}

            {allowedEmails.length > 0 && (
              <div className="mt-3 rounded-2xl border border-border bg-surface-muted/60 p-3">
                <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    {allowedEmails.length} email
                    {allowedEmails.length === 1 ? "" : "s"} on allow list
                  </span>
                  <button
                    className="font-medium text-destructive hover:underline"
                    onClick={() => {
                      setAllowedEmails([]);
                      setUploadName(null);
                    }}
                  >
                    Clear all
                  </button>
                </div>
                <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
                  {allowedEmails.map((e) => (
                    <span
                      key={e}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-2.5 py-1 text-xs"
                    >
                      {e}
                      <button
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          setAllowedEmails((cur) => cur.filter((x) => x !== e))
                        }
                        aria-label={`Remove ${e}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-7 flex flex-wrap gap-2">
            <button onClick={generate} disabled={saving} className="btn-accent">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
              {saving ? "Generating…" : "Generate secure invite link"}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                localStorage.setItem(
                  "fb.campaign.draft",
                  JSON.stringify({
                    orgId,
                    title,
                    category,
                    startsAt,
                    closes,
                    options,
                    allowedEmails,
                  }),
                );
                setError(null);
                alert("Draft saved locally.");
              }}
            >
              Save draft
            </button>
            {error && <p className="w-full text-sm text-destructive">{error}</p>}
          </div>
        </section>

        <aside className="fb-card h-fit p-6">
          <h3 className="font-display text-sm font-bold text-foreground">
            Invite links
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Each employee gets their own unique link. A link disables permanently
            once that person has used it to vote.
          </p>
          <div className="mt-4">
            {invites.length > 0 ? (
              <div className="space-y-3">
                {invites.map((invite) => (
                  <div
                    key={invite.invite_url}
                    className="rounded-2xl border border-border bg-surface-muted p-3"
                  >
                    <p className="text-xs font-semibold text-foreground">{invite.email}</p>
                    <p className="mt-1 text-xs break-all text-muted-foreground">
                      {invite.invite_url}
                    </p>
                    <button
                      onClick={() => navigator.clipboard?.writeText(invite.invite_url)}
                      className="btn-outline mt-2 w-full text-xs"
                    >
                      <Copy className="h-3.5 w-3.5" /> Copy link
                    </button>
                  </div>
                ))}
                {invites.length > 1 && (
                  <button
                    onClick={() =>
                      navigator.clipboard?.writeText(
                        invites.map((i) => `${i.email}: ${i.invite_url}`).join("\n"),
                      )
                    }
                    className="btn-primary w-full text-xs"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy all {invites.length} links
                  </button>
                )}

                <div className="border-t border-border pt-3">
                  <p className="mb-2 text-xs font-semibold text-foreground">Download to send</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() =>
                        downloadText("fansbench-invites.csv", invitesToCsv(invites), "text/csv")
                      }
                      className="btn-outline text-xs"
                    >
                      <Download className="h-3.5 w-3.5" /> CSV (mail-merge)
                    </button>
                    <button
                      onClick={() =>
                        downloadText(
                          "fansbench-invite-emails.txt",
                          invitesToEmailTemplate(invites, title, org),
                        )
                      }
                      className="btn-outline text-xs"
                    >
                      <Download className="h-3.5 w-3.5" /> Email template
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                No links generated yet.
              </div>
            )}
          </div>

          <div className="mt-6 rounded-2xl bg-secondary p-4 text-xs text-primary">
            <p className="font-semibold">{title || "Untitled"}</p>
            <p className="mt-1 opacity-80">
              {org} · {options.length} option{options.length === 1 ? "" : "s"} ·{" "}
              {allowedEmails.length} allowed voter
              {allowedEmails.length === 1 ? "" : "s"}
            </p>
            {(startsAt || closes) && (
              <p className="mt-1 opacity-80">
                {startsAt ? `Opens ${new Date(startsAt).toLocaleString()}` : ""}
                {startsAt && closes ? " → " : ""}
                {closes ? `Closes ${new Date(closes).toLocaleString()}` : ""}
              </p>
            )}
          </div>
        </aside>
      </div>
    </AdminLayout>
  );
}
