import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldAlert, CheckCircle2, XCircle, Ban, Loader2 } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { adminApi, type FraudFlag } from "@/lib/api";

export const Route = createFileRoute("/admin/fraud")({
  component: Fraud,
});

type Action = "clear" | "invalidate" | "cancel";

const ACTION_COPY: Record<
  Action,
  { verb: string; title: string; description: string; done: string; destructive: boolean }
> = {
  clear: {
    verb: "Validate vote",
    title: "Validate this vote?",
    description:
      "The flagged vote will be confirmed as legitimate and counted toward the tally. The fraud flag is cleared.",
    done: "Vote validated",
    destructive: false,
  },
  invalidate: {
    verb: "Invalidate vote",
    title: "Invalidate this vote?",
    description:
      "The vote will be rejected and removed from the tally. The payment is kept — no refund is issued.",
    done: "Vote invalidated",
    destructive: true,
  },
  cancel: {
    verb: "Cancel vote & payment",
    title: "Cancel this vote and its payment?",
    description:
      "The vote is rejected and its M-Pesa transaction is marked cancelled so finance can refund it. Use for accidental, duplicate or test votes.",
    done: "Vote and payment cancelled",
    destructive: true,
  },
};

function formatReviewTime(seconds: number): string {
  if (seconds <= 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

function formatAmount(amount?: number | string | null): string | null {
  if (amount === null || amount === undefined) return null;
  const n = typeof amount === "string" ? Number(amount) : amount;
  return Number.isNaN(n) ? null : `KES ${n.toLocaleString()}`;
}

function Fraud() {
  const [queue, setQueue] = useState<FraudFlag[]>([]);
  const [pending, setPending] = useState<{ flag: FraudFlag; action: Action } | null>(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [stats, setStats] = useState({ resolved_today: 0, avg_review_seconds: 0 });

  useEffect(() => {
    adminApi.fraud
      .list()
      .then((r) => setQueue(r.data.filter((f) => f.status === "open")))
      .catch(() => setQueue([]));
    adminApi.fraud.stats().then(setStats).catch(() => {});
  }, []);

  function toast(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(null), 2500);
  }

  async function runAction() {
    if (!pending) return;
    const { flag, action } = pending;
    setBusy(true);
    try {
      if (action === "clear") await adminApi.fraud.clear(flag.id);
      else if (action === "invalidate") await adminApi.fraud.invalidate(flag.id);
      else await adminApi.fraud.cancel(flag.id);
      setQueue((c) => c.filter((x) => x.id !== flag.id));
      toast(ACTION_COPY[action].done);
      adminApi.fraud.stats().then(setStats).catch(() => {});
    } catch {
      toast("That action could not be completed. Try again.");
    } finally {
      setBusy(false);
      setPending(null);
    }
  }

  function exportCsv() {
    const header = "id,reason,campaign,risk,vote_status,voter_phone,amount,when";
    const rows = queue.map((q) =>
      [
        q.code,
        `"${q.reason.replace(/"/g, '""')}"`,
        `"${q.campaign}"`,
        q.risk,
        q.vote?.status ?? "",
        q.vote?.voter_phone ?? "",
        formatAmount(q.vote?.amount) ?? "",
        q.created_at,
      ].join(","),
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fansbench-fraud-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AdminLayout
      title="Fraud & Verification Queue"
      actions={
        <button className="btn-outline" onClick={exportCsv}>
          Export CSV
        </button>
      }
    >
      {flash && (
        <div className="mb-4 rounded-md border border-success bg-[color-mix(in_oklab,var(--success)_10%,transparent)] px-3 py-2 text-sm text-success">
          {flash}
        </div>
      )}
      <section className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Open flags" value={String(queue.length)} tone="destructive" />
        <SummaryCard label="Resolved today" value={String(stats.resolved_today)} tone="success" />
        <SummaryCard
          label="Avg. review time"
          value={formatReviewTime(stats.avg_review_seconds)}
          tone="primary"
        />
      </section>

      <div className="fb-card mt-6 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border p-4">
          <ShieldAlert className="h-4 w-4 text-destructive" />
          <h2 className="text-sm font-semibold text-foreground">Review queue</h2>
        </div>
        {queue.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            All flags reviewed. Nothing else in the queue.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {queue.map((q) => {
              const amount = formatAmount(q.vote?.amount);
              return (
                <li key={String(q.id)} className="flex flex-col gap-3 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">{q.code}</span>
                        <RiskPill risk={q.risk} />
                      </div>
                      <p className="mt-1 text-sm font-medium text-foreground">{q.reason}</p>
                      <p className="text-xs text-muted-foreground">
                        {q.campaign} · flagged {formatWhen(q.created_at)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button
                        disabled={busy}
                        onClick={() => setPending({ flag: q, action: "clear" })}
                        className="btn-outline"
                      >
                        <CheckCircle2 className="h-4 w-4" /> Validate
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => setPending({ flag: q, action: "invalidate" })}
                        className="btn-outline !text-destructive"
                      >
                        <XCircle className="h-4 w-4" /> Invalidate
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => setPending({ flag: q, action: "cancel" })}
                        className="btn-accent"
                      >
                        <Ban className="h-4 w-4" /> Cancel
                      </button>
                    </div>
                  </div>

                  {q.vote ? (
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-md bg-surface-muted p-3 text-xs sm:grid-cols-4">
                      <Detail label="Vote status" value={q.vote.status} />
                      <Detail label="Voter phone" value={q.vote.voter_phone} />
                      <Detail label="Nominee / option" value={q.vote.option} />
                      <Detail label="Amount" value={amount} />
                      <Detail label="Payment" value={q.vote.payment_status} />
                      <Detail label="M-Pesa ref" value={q.vote.mpesa_reference} />
                      <Detail label="IP address" value={q.vote.ip_address} />
                      <Detail
                        label="Cast at"
                        value={q.vote.cast_at ? formatWhen(q.vote.cast_at) : null}
                      />
                    </dl>
                  ) : (
                    <p className="rounded-md bg-surface-muted p-3 text-xs text-muted-foreground">
                      The underlying vote record is no longer available.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(o) => !o && !busy && setPending(null)}
        title={pending ? ACTION_COPY[pending.action].title : ""}
        description={
          pending ? (
            <>
              {ACTION_COPY[pending.action].description}
              <span className="mt-2 block font-mono text-xs text-foreground">
                {pending.flag.code}
                {pending.flag.vote?.voter_phone ? ` · ${pending.flag.vote.voter_phone}` : ""}
              </span>
            </>
          ) : undefined
        }
        confirmLabel={pending ? ACTION_COPY[pending.action].verb : "Confirm"}
        destructive={pending ? ACTION_COPY[pending.action].destructive : false}
        loading={busy}
        onConfirm={runAction}
      />
    </AdminLayout>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium text-foreground">{value || "—"}</dd>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "destructive" | "success" | "primary";
}) {
  const bar =
    tone === "destructive"
      ? "bg-destructive"
      : tone === "success"
        ? "bg-success"
        : "bg-primary";
  return (
    <div className="fb-card overflow-hidden">
      <div className={`h-1 ${bar}`} />
      <div className="p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function RiskPill({ risk }: { risk: string }) {
  const cls =
    risk === "High"
      ? "!bg-[color-mix(in_oklab,var(--destructive)_15%,transparent)] !text-destructive"
      : risk === "Medium"
        ? "!bg-[color-mix(in_oklab,var(--accent)_15%,transparent)] !text-accent"
        : "!bg-[color-mix(in_oklab,var(--success)_15%,transparent)] !text-success";
  return <span className={`chip ${cls}`}>{risk} risk</span>;
}
