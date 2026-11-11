import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { downloadAuthedFile } from "@/lib/downloadFile";

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

/** Date-range inputs + PDF/Excel export buttons shared by every Reports sub-page. */
export function ReportToolbar({
  from,
  to,
  onFromChange,
  onToChange,
  exportPath,
  exportBaseName,
}: {
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  exportPath: string;
  exportBaseName: string;
}) {
  const [downloading, setDownloading] = useState<"pdf" | "xlsx" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function download(format: "pdf" | "xlsx") {
    setDownloading(format);
    setError(null);
    try {
      await downloadAuthedFile(exportPath, { from, to, format }, `${exportBaseName}.${format}`);
    } catch {
      setError("Couldn't generate that export. Try again.");
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="fb-card mb-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-semibold text-foreground">Date range</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">From</label>
              <input type="date" className="fb-input" value={from} max={to} onChange={(e) => onFromChange(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">To</label>
              <input
                type="date"
                className="fb-input"
                value={to}
                min={from}
                max={todayIso()}
                onChange={(e) => onToChange(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" disabled={downloading !== null} onClick={() => download("pdf")} className="btn-outline">
            {downloading === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download PDF
          </button>
          <button type="button" disabled={downloading !== null} onClick={() => download("xlsx")} className="btn-primary">
            {downloading === "xlsx" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download Excel
          </button>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        A copy of whichever file you download is also emailed to your own inbox.
      </p>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
