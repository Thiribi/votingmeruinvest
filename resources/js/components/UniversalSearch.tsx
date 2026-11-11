import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, Loader2, Users, Building2, Trophy, Layers, Vote as VoteIcon } from "lucide-react";
import { searchApi, type SearchResult, type SearchResultType } from "@/lib/api";

type Destination = { to: string; search?: Record<string, string> };

const TYPE_META: Record<
  SearchResultType,
  { label: string; icon: typeof Search; destination: (r: SearchResult) => Destination }
> = {
  category: { label: "Category", icon: Layers, destination: () => ({ to: "/categories" }) },
  subcategory: { label: "Subcategory", icon: Layers, destination: () => ({ to: "/categories" }) },
  // Straight into voting for this exact nominee, scoped to their category/subcategory —
  // not a generic, unfiltered ranking the fan then has to hunt through.
  nominee: {
    label: "Nominee",
    icon: Trophy,
    destination: (r) => ({
      to: "/vote",
      search: {
        category_id: String(r.category_id ?? ""),
        ...(r.subcategory_id ? { subcategory_id: String(r.subcategory_id) } : {}),
        nominee_id: String(r.id),
      },
    }),
  },
  organization: { label: "Organization", icon: Building2, destination: () => ({ to: "/organizations" }) },
  campaign: { label: "Campaign", icon: VoteIcon, destination: (r) => ({ to: `/campaign/${r.id}` }) },
};

const DEBOUNCE_MS = 250;

/**
 * Universal search box: debounced calls to /api/search, grouped typed results in a
 * dropdown, keyboard dismissable. Used in the header (every page, incl. landing) and,
 * larger, in the landing hero.
 */
export function UniversalSearch({
  className,
  placeholder = "Search",
  autoFocus = false,
  size = "sm",
}: {
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
  size?: "sm" | "lg";
}) {
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = term.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let cancelled = false;
    const handle = setTimeout(() => {
      searchApi
        .query(q)
        .then((r) => {
          if (!cancelled) setResults(r.results);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [term]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function go(result: SearchResult) {
    setOpen(false);
    setTerm("");
    const { to, search } = TYPE_META[result.type].destination(result);
    navigate({ to, search });
  }

  const showDropdown = open && term.trim().length >= 2;
  const grouped = useMemo(() => {
    const order: SearchResultType[] = [
      "category",
      "subcategory",
      "nominee",
      "organization",
      "campaign",
    ];
    return order
      .map((type) => ({ type, items: results.filter((r) => r.type === type) }))
      .filter((g) => g.items.length > 0);
  }, [results]);

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (results.length > 0) go(results[0]);
        }}
      >
        <Search
          className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground ${
            size === "lg" ? "h-5 w-5" : "h-4 w-4"
          }`}
        />
        <input
          className={`fb-input pl-9 ${size === "lg" ? "h-12 text-base" : ""}`}
          placeholder={placeholder}
          value={term}
          autoFocus={autoFocus}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setTerm(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
          aria-label="Universal search"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </form>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-lg border border-border bg-surface shadow-lg">
          {!loading && grouped.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              No matches for “{term.trim()}”.
            </p>
          ) : (
            grouped.map((group) => {
              const Icon = TYPE_META[group.type].icon;
              return (
                <div key={group.type} className="border-b border-border last:border-b-0">
                  <p className="flex items-center gap-1.5 px-3 pt-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <Icon className="h-3 w-3" />
                    {TYPE_META[group.type].label}
                  </p>
                  <ul>
                    {group.items.map((r) => (
                      <li key={`${r.type}-${r.id}`}>
                        <button
                          type="button"
                          onClick={() => go(r)}
                          className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-surface-muted"
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-foreground">
                              {r.title}
                            </span>
                            {r.subtitle && (
                              <span className="block truncate text-xs text-muted-foreground">
                                {r.subtitle}
                              </span>
                            )}
                          </span>
                          {typeof r.votes_count === "number" && (
                            <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                              <Users className="h-3 w-3" />
                              {r.votes_count.toLocaleString()}
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
