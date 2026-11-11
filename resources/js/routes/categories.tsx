import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Eye, Tags, Users } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { categoriesApi, type Category } from "@/lib/api";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "Categories — FansBench" },
      {
        name: "description",
        content: "Browse verified fan categories: Music, Sports, Tech, Business and more.",
      },
    ],
  }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    categoriesApi
      .list()
      .then((r) => setCats(r.data))
      .catch(() => setCats([]))
      .finally(() => setLoading(false));
  }, []);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <AppLayout>
      <section>
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-foreground">Categories</h1>
          <p className="text-sm text-muted-foreground">
            Explore verified categories and their nominees.
          </p>
        </div>
        {!loading && cats.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No categories have been published yet — check back soon.
          </p>
        )}
        {/* One card per row, matching how a feed post header reads: picture, title, subtitle, action. */}
        <div className="flex flex-col gap-4">
          {cats.map((c) => {
            const id = String(c.id);
            const isOpen = expanded.has(id);
            const subcategories = c.subcategories ?? [];
            return (
              <div key={id} className="fb-card fb-card-hover p-5">
                <div className="flex items-center gap-4">
                  <Link
                    to="/leaderboard"
                    search={{ category_id: id }}
                    className="group flex min-w-0 flex-1 items-center gap-4"
                  >
                    <Avatar className="h-12 w-12 shrink-0 border border-border">
                      <AvatarImage src={c.image_url ?? undefined} alt={c.name} />
                      <AvatarFallback className="bg-secondary text-primary">
                        <Tags className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-foreground group-hover:underline">{c.name}</p>
                      <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                        {c.description || "No description yet."}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {c.nominees_count} nominee{c.nominees_count === 1 ? "" : "s"} · {c.status}
                      </p>
                    </div>
                  </Link>
                  <Link
                    to="/leaderboard"
                    search={{ category_id: id }}
                    className="btn-outline shrink-0"
                  >
                    <Eye className="h-4 w-4" /> View
                  </Link>
                </div>

                {subcategories.length > 0 && (
                  <button
                    type="button"
                    onClick={() => toggle(id)}
                    className="mt-3 flex w-full items-center justify-between text-xs font-semibold text-primary"
                  >
                    <span>
                      {subcategories.length} subcategor{subcategories.length === 1 ? "y" : "ies"}
                    </span>
                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                )}

                {isOpen && subcategories.length > 0 && (
                  <ul className="mt-2 space-y-2">
                    {subcategories.map((sub) => (
                      <li
                        key={String(sub.id)}
                        className="flex items-center gap-3 rounded-xl bg-surface-muted p-2.5"
                      >
                        <Link
                          to="/leaderboard"
                          search={{ category_id: id, subcategory_id: String(sub.id) }}
                          className="group flex min-w-0 flex-1 items-center gap-3"
                        >
                          <Avatar className="h-9 w-9 shrink-0">
                            <AvatarImage src={sub.image_url ?? undefined} alt={sub.name} />
                            <AvatarFallback className="bg-white text-primary">
                              <Users className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground group-hover:underline">
                              {sub.name}
                            </p>
                            {sub.description && (
                              <p className="truncate text-xs text-muted-foreground">{sub.description}</p>
                            )}
                          </div>
                        </Link>
                        <Link
                          to="/leaderboard"
                          search={{ category_id: id, subcategory_id: String(sub.id) }}
                          className="btn-outline shrink-0 !px-3 !py-1 text-xs"
                        >
                          <Eye className="h-3.5 w-3.5" /> View
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </AppLayout>
  );
}
