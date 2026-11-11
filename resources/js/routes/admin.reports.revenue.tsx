import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Coins, Loader2 } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { Pagination } from "@/components/Pagination";
import { ReportToolbar, daysAgoIso, todayIso } from "@/components/ReportToolbar";
import { adminApi } from "@/lib/api";

export const Route = createFileRoute("/admin/reports/revenue")({
  component: RevenueReportPage,
});

type RevenueRow = Awaited<ReturnType<typeof adminApi.reports.revenue>>["data"][number];

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

function RevenueReportPage() {
  const [from, setFrom] = useState(daysAgoIso(30));
  const [to, setTo] = useState(todayIso());
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<RevenueRow[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 10, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => setPage(1), [from, to]);

  useEffect(() => {
    setLoading(true);
    adminApi.reports
      .revenue({ from, to, page })
      .then((r) => {
        setRows(r.data);
        if (r.meta) setMeta(r.meta);
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [from, to, page]);

  const totalCompleted = rows
    .filter((r) => r.status === "completed")
    .reduce((sum, r) => sum + (r.amount ?? 0), 0);

  return (
    <AdminLayout title="Reports — Revenue">
      <ReportToolbar
        from={from}
        to={to}
        onFromChange={setFrom}
        onToChange={setTo}
        exportPath="/admin/reports/revenue/export"
        exportBaseName={`revenue-${from}-to-${to}`}
      />

      <div className="fb-card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border p-4">
          <Coins className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-foreground">
            {loading
              ? "Loading…"
              : `${meta.total.toLocaleString()} transactions in this range · KSH ${totalCompleted.toLocaleString()} completed on this page`}
          </h2>
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
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Payer</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((tx) => (
                  <tr key={String(tx.id)} className="hover:bg-surface-muted/50">
                    <td className="px-4 py-3 text-foreground">{formatDate(tx.date)}</td>
                    <td className="px-4 py-3">
                      <span className="chip capitalize">{tx.status}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{tx.payer_name ?? "Guest"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{tx.phone_number ?? "—"}</td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {tx.amount != null ? `KSH ${tx.amount}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">{tx.provider ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{tx.provider_reference ?? "—"}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No transactions in this range.
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
