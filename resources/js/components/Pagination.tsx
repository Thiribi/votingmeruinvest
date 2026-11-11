import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({
  page,
  lastPage,
  total,
  onChange,
}: {
  page: number;
  lastPage: number;
  total: number;
  onChange: (page: number) => void;
}) {
  if (lastPage <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
      <p className="text-muted-foreground">
        Page {page} of {lastPage} &middot; {total.toLocaleString()} total
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          className="btn-outline"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" /> Prev
        </button>
        <button
          type="button"
          className="btn-outline"
          disabled={page >= lastPage}
          onClick={() => onChange(page + 1)}
        >
          Next <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
