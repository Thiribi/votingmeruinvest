import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Vote as VoteIcon } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { Pagination } from "@/components/Pagination";
import { ReportToolbar, daysAgoIso, todayIso } from "@/components/ReportToolbar";
import { adminApi } from "@/lib/api";

export const Route = createFileRoute("/admin/reports/votes")({
  component: VotesReportPage,
});

type VoteRow = Awaited<ReturnType<typeof adminApi.reports.votes>>["data"][number];

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function VotesReportPage() {
  const [from, setFrom] = useState(daysAgoIso(30));
  const [to, setTo] = useState(todayIso());
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<VoteRow[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 10, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => setPage(1), [from, to]);

  useEffect(() => {
    setLoading(true);
    adminApi.reports
      .votes({ from, to, page })
      .then((r) => {
        setRows(r.data);
        if (r.meta) setMeta(r.meta);
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [from, to, page]);

  return (
    <AdminLayout title="Reports — Votes Cast">
      <ReportToolbar
        from={from}
        to={to}
        onFromChange={setFrom}
        onToChange={setTo}
        exportPath="/admin/reports/votes/export"
        exportBaseName={`votes-${from}-to-${to}`}
      />

      <div className="fb-card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border p-4">
          <VoteIcon className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-foreground">
            {loading ? "Loading…" : `${meta.total.toLocaleString()} votes in this range`}
          </h2>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Campaign</th>
                  <th className="px-4 py-3">Nominee</th>
                  <th className="px-4 py-3">Voter</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">County</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((v) => (
                  <tr key={String(v.id)} className="hover:bg-surface-muted/50">
                    <td className="px-4 py-3 text-foreground">{formatDate(v.date)}</td>
                    <td className="px-4 py-3">
                      <span className="chip capitalize">{v.status.replace("_", " ")}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{v.campaign ?? "—"}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{v.nominee ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{v.voter_name ?? "Guest"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{v.voter_phone ?? v.guest_phone ?? "—"}</td>
                    <td className="px-4 py-3 text-foreground">{v.amount != null ? `KSH ${v.amount}` : "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{v.county ?? "—"}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No votes in this range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={meta.current_page} lastPage={meta.last_page} total={meta.total} onChange={setPage} />
      </div>
    </AdminLayout>
  );
}
