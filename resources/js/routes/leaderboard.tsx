import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trophy, Loader2, Vote as VoteIcon, X } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { categoriesApi, nomineesApi, type Category, type Nominee } from "@/lib/api";
import { formatVotes } from "@/lib/format";

type LeaderboardSearch = { category_id?: string; subcategory_id?: string };

export const Route = createFileRoute("/leaderboard")({
  validateSearch: (search: Record<string, unknown>): LeaderboardSearch => ({
    category_id:
      typeof search.category_id === "string" || typeof search.category_id === "number"
        ? String(search.category_id)
        : undefined,
    subcategory_id:
      typeof search.subcategory_id === "string" || typeof search.subcategory_id === "number"
        ? String(search.subcategory_id)
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Leaderboard — FansBench" },
      {
        name: "description",
        content: "Top verified nominees across FansBench categories.",
      },
    ],
  }),
  component: LeaderboardPage,
});

/** Where clicking a nominee row sends the fan — straight into voting for them. */
function voteDestination(n: Nominee) {
  return {
    category_id: String(n.category_id),
    ...(n.subcategory_id ? { subcategory_id: String(n.subcategory_id) } : {}),
    nominee_id: String(n.id),
  };
}

function NomineeRow({ n, rank }: { n: Nominee; rank: number }) {
  return (
    <Link
      to="/vote"
      search={voteDestination(n)}
      className="flex items-center gap-4 py-3 hover:bg-surface-muted/50"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-primary">
        {rank}
      </span>
      <Avatar className="h-9 w-9 shrink-0 border border-border">
        <AvatarImage src={n.avatar_url ?? undefined} alt={n.name} />
        <AvatarFallback className="bg-surface-muted text-xs font-semibold text-primary">
          {n.name.slice(0, 1).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-foreground">{n.name}</p>
        <p className="truncate text-xs text-muted-foreground">{n.tag}</p>
      </div>
      <span className="text-sm font-semibold text-foreground" title={`${n.votes_count.toLocaleString()} verified votes`}>
        {formatVotes(n.votes_count)}
      </span>
    </Link>
  );
}

function LeaderboardPage() {
  const { category_id, subcategory_id } = Route.useSearch();
  const [rows, setRows] = useState<Nominee[]>([]);
  const [groups, setGroups] = useState<{ category: Category; nominees: Nominee[] }[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);

  // Filtered (from a category/subcategory "View"/"Vote now" link): one flat, scoped ranking.
  useEffect(() => {
    if (!category_id) return;
    setLoading(true);
    nomineesApi
      .leaderboard({ category_id, subcategory_id, limit: 50 })
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [category_id, subcategory_id]);

  // Unfiltered (from the nav): grouped by category instead of one flat, mixed ranking —
  // a top club and a top radio host being compared head-to-head read as arbitrary noise.
  useEffect(() => {
    if (category_id) return;
    setLoading(true);
    categoriesApi
      .list()
      .then(async (r) => {
        const withNominees = await Promise.all(
          r.data.map(async (cat) => ({
            category: cat,
            nominees: await nomineesApi.leaderboard({ category_id: cat.id, limit: 5 }).catch(() => []),
          })),
        );
        setGroups(withNominees.filter((g) => g.nominees.length > 0));
      })
      .catch(() => setGroups([]))
      .finally(() => setLoading(false));
  }, [category_id]);

  useEffect(() => {
    if (!category_id) {
      setCategory(null);
      return;
    }
    categoriesApi.get(category_id).then(setCategory).catch(() => setCategory(null));
  }, [category_id]);

  const subcategory = subcategory_id
    ? (category?.subcategories ?? []).find((s) => String(s.id) === subcategory_id)
    : null;

  return (
    <AppLayout>
      <section className="fb-card p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-accent" />
              <h1 className="text-xl font-bold text-foreground">
                {category ? `${category.name}${subcategory ? ` — ${subcategory.name}` : ""}` : "Leaderboard"}
              </h1>
              {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {category
                ? `Ranked by verified votes in ${subcategory ? subcategory.name : category.name}.`
                : "Top verified nominees, grouped by category."}
            </p>
          </div>
          {category_id && (
            <Link
              to="/vote"
              search={{ category_id, subcategory_id }}
              className="btn-accent shrink-0"
            >
              <VoteIcon className="h-4 w-4" /> Vote now
            </Link>
          )}
        </div>
        {category_id && (
          <Link to="/leaderboard" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
            <X className="h-3 w-3" /> Clear filter — show overall leaderboard
          </Link>
        )}

        {category_id ? (
          <>
            {!loading && rows.length === 0 && (
              <p className="mt-6 py-8 text-center text-sm text-muted-foreground">
                No verified votes yet — check back once voting is underway.
              </p>
            )}
            <ol className="mt-6 divide-y divide-border">
              {rows.map((n, i) => (
                <li key={String(n.id)}>
                  <NomineeRow n={n} rank={i + 1} />
                </li>
              ))}
            </ol>
          </>
        ) : (
          <>
            {!loading && groups.length === 0 && (
              <p className="mt-6 py-8 text-center text-sm text-muted-foreground">
                No verified votes yet — check back once voting is underway.
              </p>
            )}
            <div className="mt-6 flex flex-col gap-6">
              {groups.map(({ category: cat, nominees }) => (
                <div key={String(cat.id)}>
                  <div className="mb-1 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-foreground">{cat.name}</h2>
                    <Link
                      to="/leaderboard"
                      search={{ category_id: String(cat.id) }}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      See all
                    </Link>
                  </div>
                  <ol className="divide-y divide-border">
                    {nominees.map((n, i) => (
                      <li key={String(n.id)}>
                        <NomineeRow n={n} rank={i + 1} />
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </AppLayout>
  );
}
