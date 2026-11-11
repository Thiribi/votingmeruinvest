import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ListChecks, Loader2, CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/lib/auth";
import { votesApi, type Vote } from "@/lib/api";

export const Route = createFileRoute("/voting-history")({
  head: () => ({
    meta: [
      { title: "Voting History — FansBench" },
      { name: "description", content: "Every vote you've cast on FansBench." },
    ],
  }),
  component: VotingHistoryPage,
});

const STATUS_META: Record<
  string,
  { label: string; icon: typeof CheckCircle2; className: string }
> = {
  verified: { label: "Verified", icon: CheckCircle2, className: "text-success" },
  pending_payment: { label: "Pending payment", icon: Clock, className: "text-muted-foreground" },
  rejected: { label: "Rejected", icon: XCircle, className: "text-destructive" },
  flagged: { label: "Under review", icon: AlertTriangle, className: "text-accent" },
};

function formatDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function VotingHistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login", search: { redirect: "/voting-history" } });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    votesApi
      .mine()
      .then((r) => setVotes(r))
      .catch(() => setVotes([]))
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading || !user) return null;

  return (
    <AppLayout>
      <section className="fb-card p-6">
        <div className="flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Voting History</h1>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Every vote you've cast, with its verification status.
        </p>

        {!loading && votes.length === 0 ? (
          <div className="mt-6 py-8 text-center">
            <p className="text-sm text-muted-foreground">You haven't cast any votes yet.</p>
            <Link to="/vote" className="btn-accent mt-3 inline-flex">
              Cast your first vote
            </Link>
          </div>
        ) : (
          <ul className="mt-6 divide-y divide-border">
            {votes.map((v) => {
              const meta = STATUS_META[v.status ?? ""] ?? STATUS_META.pending_payment;
              const Icon = meta.icon;
              return (
                <li key={String(v.id)} className="flex items-center gap-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-foreground">
                      {v.option_label ?? "Your pick"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {v.campaign_title ?? `Campaign #${v.campaign_id}`}
                      {v.created_at ? ` · ${formatDate(v.created_at)}` : ""}
                    </p>
                  </div>
                  <span className={`flex shrink-0 items-center gap-1.5 text-xs font-medium ${meta.className}`}>
                    <Icon className="h-4 w-4" />
                    {meta.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </AppLayout>
  );
}
