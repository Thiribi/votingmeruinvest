import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { History, Loader2, Trophy } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { campaignsApi, type Campaign } from "@/lib/api";

export const Route = createFileRoute("/historical-rankings")({
  head: () => ({
    meta: [
      { title: "Historical Rankings — FansBench" },
      {
        name: "description",
        content: "Final standings from closed FansBench voting campaigns.",
      },
    ],
  }),
  component: HistoricalRankingsPage,
});

function formatClosed(closesAt?: string | null): string | null {
  if (!closesAt) return null;
  const d = new Date(closesAt);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function HistoricalRankingsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    campaignsApi
      .list({ status: "closed", visibility: "public" })
      .then((r) => setCampaigns(r.data))
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout>
      <section className="fb-card p-6">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Historical Rankings</h1>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Final, verified standings from campaigns that have closed.
        </p>

        {!loading && campaigns.length === 0 && (
          <p className="mt-6 py-8 text-center text-sm text-muted-foreground">
            No closed campaigns yet — historical results will appear here once voting
            cycles end.
          </p>
        )}

        <div className="mt-6 flex flex-col gap-5">
          {campaigns.map((c) => (
            <ClosedCampaign key={String(c.id)} campaign={c} closedOn={formatClosed(c.closes_at)} />
          ))}
        </div>
      </section>
    </AppLayout>
  );
}

function ClosedCampaign({
  campaign,
  closedOn,
}: {
  campaign: Campaign;
  closedOn: string | null;
}) {
  const options = [...(campaign.options ?? [])].sort(
    (a, b) => (b.votes_count ?? 0) - (a.votes_count ?? 0),
  );
  const total = options.reduce((sum, o) => sum + (o.votes_count ?? 0), 0);

  return (
    <article className="rounded-lg border border-border p-4">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-semibold text-foreground">{campaign.title}</h2>
          <p className="text-xs text-muted-foreground">
            {campaign.category ?? "Campaign"}
            {closedOn ? ` · Closed ${closedOn}` : ""}
          </p>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {total.toLocaleString()} votes
        </span>
      </header>

      {options.length > 0 ? (
        <ol className="mt-3 space-y-2">
          {options.map((o, i) => {
            const pct = total > 0 ? Math.round(((o.votes_count ?? 0) / total) * 100) : 0;
            return (
              <li key={String(o.id)}>
                <div className="mb-1 flex items-center gap-2 text-sm">
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                      i === 0 ? "bg-accent text-white" : "bg-secondary text-primary"
                    }`}
                  >
                    {i === 0 ? <Trophy className="h-3 w-3" /> : i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                    {o.nominee?.name ?? o.label}
                  </span>
                  <span className="text-muted-foreground">{pct}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">No recorded standings.</p>
      )}
    </article>
  );
}
