import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Users,
  Vote,
  ShieldAlert,
  TrendingUp,
  Loader2,
  Wallet,
  Clock,
  UserCheck,
  CalendarRange,
  Building2,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { AdminLayout } from "@/components/AdminLayout";
import { adminApi } from "@/lib/api";

export const Route = createFileRoute("/admin/")({
  component: Dashboard,
});

type Stats = {
  verified_voters: number;
  votes_24h: number;
  open_fraud_flags: number;
  active_campaigns: number;
  mpesa_reconciliation_pct: number | null;
  otp_delivery_pct: number | null;
  fraud_sla_pct: number | null;
  revenue_30d: number;
  votes_30d: number;
  pending_transactions: number;
  total_fans: number;
};

type AuditLogEntry = {
  id: string | number;
  action: string;
  description: string;
  actor_name: string;
  created_at: string;
};

type SeriesPoint = { date: string; votes: number; revenue: number };

type Transaction = {
  id: string | number;
  payer: string;
  phone_number: string | null;
  amount: number;
  status: string;
  provider_reference: string | null;
  created_at: string | null;
};

type OrgStat = {
  id: string | number;
  name: string;
  logo_url: string | null;
  campaigns_count: number;
  votes: number;
  revenue: number;
};

const EMPTY_STATS: Stats = {
  verified_voters: 0,
  votes_24h: 0,
  open_fraud_flags: 0,
  active_campaigns: 0,
  mpesa_reconciliation_pct: null,
  otp_delivery_pct: null,
  fraud_sla_pct: null,
  revenue_30d: 0,
  votes_30d: 0,
  pending_transactions: 0,
  total_fans: 0,
};

// The FansBench mark's own 5-figure gradient (navy → electric blue → vibrant orange) — reused
// here so the dashboard's cards read as an extension of the brand instead of flat, uniform navy.
const LOGO_PALETTE = ["#12355B", "#1E4E8C", "#2F80ED", "#FB923C", "#F97316"];

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatKsh(n: number): string {
  return `KSH ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function formatChartDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const STATUS_STYLES: Record<string, string> = {
  completed: "!bg-[color-mix(in_oklab,var(--success)_15%,transparent)] !text-success",
  pending: "!bg-[color-mix(in_oklab,var(--accent)_15%,transparent)] !text-accent",
  failed: "!bg-[color-mix(in_oklab,var(--destructive)_15%,transparent)] !text-destructive",
  cancelled: "!bg-[color-mix(in_oklab,var(--destructive)_15%,transparent)] !text-destructive",
};

function Dashboard() {
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [series, setSeries] = useState<SeriesPoint[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [orgs, setOrgs] = useState<OrgStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminApi.stats(),
      adminApi.auditLogs({ per_page: 8 }),
      adminApi.statsSeries({ days: 14 }),
      adminApi.transactions({ limit: 8 }),
      adminApi.statsOrganizations(),
    ])
      .then(([s, l, sr, tx, org]) => {
        setStats(s);
        setLogs(l.data);
        setSeries(sr.data);
        setTransactions(tx.data);
        setOrgs(org.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: "Verified voters", value: stats.verified_voters.toLocaleString(), icon: Users },
    { label: "Votes cast (24h)", value: stats.votes_24h.toLocaleString(), icon: Vote },
    { label: "Votes cast (30d)", value: stats.votes_30d.toLocaleString(), icon: CalendarRange },
    { label: "Active campaigns", value: stats.active_campaigns.toLocaleString(), icon: TrendingUp },
    { label: "Revenue (30d)", value: formatKsh(stats.revenue_30d), icon: Wallet },
    { label: "Pending transactions", value: stats.pending_transactions.toLocaleString(), icon: Clock },
    { label: "Fraud flags open", value: stats.open_fraud_flags.toLocaleString(), icon: ShieldAlert },
    { label: "Total fans", value: stats.total_fans.toLocaleString(), icon: UserCheck },
  ];

  return (
    <AdminLayout
      title="Dashboard"
      actions={<Link to="/admin/campaigns" className="btn-primary">New campaign</Link>}
    >
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((s, i) => {
          const color = LOGO_PALETTE[i % LOGO_PALETTE.length];
          return (
            <div key={s.label} className="fb-card overflow-hidden">
              <div className="h-1" style={{ backgroundColor: color }} />
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {s.label}
                  </p>
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${color}1A`, color }}
                  >
                    <s.icon className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-2 text-2xl font-bold text-foreground">{loading ? "—" : s.value}</p>
              </div>
            </div>
          );
        })}
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="fb-card p-5">
          <h2 className="text-base font-semibold text-foreground">Votes cast — last 14 days</h2>
          <div className="mt-4 h-56">
            {loading ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatChartDate}
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    labelFormatter={(v) => formatChartDate(String(v))}
                    formatter={(value: number) => [value.toLocaleString(), "Votes"]}
                    contentStyle={{ borderRadius: 12, borderColor: "var(--color-border)", fontSize: 12 }}
                  />
                  <Bar dataKey="votes" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="fb-card p-5">
          <h2 className="text-base font-semibold text-foreground">M-Pesa revenue — last 14 days</h2>
          <div className="mt-4 h-56">
            {loading ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ left: -20 }}>
                  <defs>
                    <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatChartDate}
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    labelFormatter={(v) => formatChartDate(String(v))}
                    formatter={(value: number) => [formatKsh(value), "Revenue"]}
                    contentStyle={{ borderRadius: 12, borderColor: "var(--color-border)", fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="var(--color-accent)" fill="url(#revenueFill)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="fb-card p-5 lg:col-span-2">
          <h2 className="text-base font-semibold text-foreground">Recent transactions</h2>
          {loading ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : transactions.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No M-Pesa transactions yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3">Payer</th>
                    <th className="py-2 pr-3">Amount</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Reference</th>
                    <th className="py-2 text-right">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {transactions.map((t) => (
                    <tr key={String(t.id)}>
                      <td className="py-2.5 pr-3">
                        <p className="font-medium text-foreground">{t.payer}</p>
                        {t.phone_number && <p className="text-xs text-muted-foreground">{t.phone_number}</p>}
                      </td>
                      <td className="py-2.5 pr-3 font-medium text-foreground">{formatKsh(t.amount)}</td>
                      <td className="py-2.5 pr-3">
                        <span className={`chip ${STATUS_STYLES[t.status] ?? ""}`}>{t.status}</span>
                      </td>
                      <td className="py-2.5 pr-3 text-xs text-muted-foreground">
                        {t.provider_reference ?? "—"}
                      </td>
                      <td className="py-2.5 text-right text-xs text-muted-foreground">
                        {t.created_at ? formatRelativeTime(t.created_at) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="fb-card p-5">
          <h2 className="text-base font-semibold text-foreground">
            Verification health
          </h2>
          <div className="mt-4 space-y-4">
            <HealthBar label="M-Pesa reconciliation" pct={stats.mpesa_reconciliation_pct} />
            <HealthBar label="Dual-OTP delivery" pct={stats.otp_delivery_pct} />
            <HealthBar label="Fraud auto-review SLA" pct={stats.fraud_sla_pct} />
          </div>
        </div>
      </section>

      <section className="mt-6">
        <div className="fb-card p-5">
          <h2 className="text-base font-semibold text-foreground">Organizations — votes &amp; revenue</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Revenue is a completed M-Pesa transaction's fee split across organizations by each
            one's share of votes in that transaction, since one payment can cover a batch of
            votes across several campaigns.
          </p>
          {loading ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : orgs.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No organization activity yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3">Organization</th>
                    <th className="py-2 pr-3">Campaigns</th>
                    <th className="py-2 pr-3">Votes</th>
                    <th className="py-2 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orgs.map((o, i) => (
                    <tr key={String(o.id)}>
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                            style={{
                              backgroundColor: `${LOGO_PALETTE[i % LOGO_PALETTE.length]}1A`,
                              color: LOGO_PALETTE[i % LOGO_PALETTE.length],
                            }}
                          >
                            <Building2 className="h-4 w-4" />
                          </div>
                          <p className="font-medium text-foreground">{o.name}</p>
                        </div>
                      </td>
                      <td className="py-2.5 pr-3 text-muted-foreground">{o.campaigns_count}</td>
                      <td className="py-2.5 pr-3 text-foreground">{o.votes.toLocaleString()}</td>
                      <td className="py-2.5 text-right font-medium text-foreground">{formatKsh(o.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="mt-6">
        <div className="fb-card p-5">
          <h2 className="text-base font-semibold text-foreground">Recent activity</h2>
          {loading ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : logs.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No admin activity recorded yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {logs.map((a) => (
                <li key={String(a.id)} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{a.description}</p>
                    <p className="text-xs text-muted-foreground">{a.actor_name}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatRelativeTime(a.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </AdminLayout>
  );
}

function HealthBar({ label, pct }: { label: string; pct: number | null }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted-foreground">{pct === null ? "No data yet" : `${pct}%`}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${pct ?? 0}%` }}
        />
      </div>
    </div>
  );
}
