import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ChevronRight, Loader2, ShoppingBasket, Tags, ArrowLeft } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { GuestVoteDialog } from "@/components/GuestVoteDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import {
  campaignsApi,
  categoriesApi,
  votesApi,
  cartApi,
  statsApi,
  ApiError,
  type Campaign,
  type CampaignOption,
  type Category,
  type Vote,
} from "@/lib/api";

type VoteSearch = { category_id?: string; subcategory_id?: string; nominee_id?: string };

function asIdString(v: unknown): string | undefined {
  return typeof v === "string" || typeof v === "number" ? String(v) : undefined;
}

export const Route = createFileRoute("/vote")({
  validateSearch: (search: Record<string, unknown>): VoteSearch => ({
    category_id: asIdString(search.category_id),
    subcategory_id: asIdString(search.subcategory_id),
    nominee_id: asIdString(search.nominee_id),
  }),
  head: () => ({
    meta: [
      { title: "Vote — FansBench" },
      {
        name: "description",
        content: "Pick a category, then a subcategory, then your nominee — and stage your vote slips.",
      },
    ],
  }),
  component: function VoteRoute() {
    const { category_id, subcategory_id, nominee_id } = Route.useSearch();
    return (
      <VotePage
        initialCategoryId={category_id ?? null}
        initialSubcategoryId={subcategory_id ?? null}
        highlightNomineeId={nominee_id ?? null}
      />
    );
  },
});

const NO_SUBCATEGORY = "__none__";

type VotableNominee = { campaign: Campaign; option: CampaignOption };
type SubGroup = {
  id: string;
  label: string;
  description?: string | null;
  image_url?: string | null;
  nominees: VotableNominee[];
};
type CatGroup = {
  id: string;
  label: string;
  description?: string | null;
  image_url?: string | null;
  subs: SubGroup[];
  total: number;
};

export function VotePage({
  initialCategoryId = null,
  initialSubcategoryId = null,
  initialSlug = null,
  highlightNomineeId = null,
}: {
  initialCategoryId?: string | null;
  initialSubcategoryId?: string | null;
  /** Resolved against `categories` once loaded — see the effect below. Takes priority over
   *  initialCategoryId/initialSubcategoryId when both are somehow given. */
  initialSlug?: string | null;
  highlightNomineeId?: string | null;
}) {
  const { user, loading: authLoading } = useAuth();
  const { cart, refresh: refreshCart } = useCart();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [myVotes, setMyVotes] = useState<Vote[]>([]);
  const [fee, setFee] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pendingOptionId, setPendingOptionId] = useState<string | number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guestTarget, setGuestTarget] = useState<VotableNominee | null>(null);
  const [slugNotFound, setSlugNotFound] = useState(false);

  const [catId, setCatId] = useState<string | null>(initialSlug ? null : initialCategoryId);
  const [subId, setSubId] = useState<string | null>(initialSlug ? null : initialSubcategoryId);
  const highlightScrolledRef = useRef(false);
  const slugResolvedRef = useRef(false);

  // Resolve a /vote/{slug} share link against the category tree once it's loaded — subcategory
  // slugs aren't guaranteed globally unique (only unique per category), so this takes the
  // first match, which is the practical behaviour for a human-chosen, admin-authored slug.
  useEffect(() => {
    if (!initialSlug || slugResolvedRef.current || categories.length === 0) return;
    slugResolvedRef.current = true;
    for (const cat of categories) {
      const sub = (cat.subcategories ?? []).find((s) => s.slug === initialSlug);
      if (sub) {
        setCatId(String(cat.id));
        setSubId(String(sub.id));
        return;
      }
    }
    setSlugNotFound(true);
  }, [initialSlug, categories]);

  // Public browsing works for everyone; only the "already voted" markers need an account.
  useEffect(() => {
    setLoading(true);
    Promise.all([
      campaignsApi.list({ status: "live", visibility: "public" }),
      categoriesApi.list(),
      statsApi.public().catch(() => ({ verification_fee: 0 })),
    ])
      .then(([campaignRes, categoryRes, stats]) => {
        setCampaigns(campaignRes.data);
        setCategories(categoryRes.data);
        setFee((stats as { verification_fee: number }).verification_fee ?? 0);
      })
      .catch(() => {
        setCampaigns([]);
        setCategories([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) {
      setMyVotes([]);
      return;
    }
    votesApi.mine().then(setMyVotes).catch(() => setMyVotes([]));
  }, [user]);

  // Informational only — fans can vote (and pay to verify) as many times as they like in the
  // same campaign, so a prior vote no longer disables picking again.
  const voteCountByCampaign = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of myVotes) map.set(String(v.campaign_id), (map.get(String(v.campaign_id)) ?? 0) + 1);
    return map;
  }, [myVotes]);
  const cartedOptionByCampaign = useMemo(() => {
    const map = new Map<string, string | number>();
    for (const item of cart?.items ?? []) map.set(String(item.campaign_id), item.option?.id ?? "");
    return map;
  }, [cart]);

  // Names for the drill-down labels come from the categories list; the votable nominees
  // themselves come from live campaign options, so we only ever show what can be voted on.
  const tree = useMemo<CatGroup[]>(() => {
    const catName = new Map<string, string>();
    const catDesc = new Map<string, string | null | undefined>();
    const catImage = new Map<string, string | null | undefined>();
    const subName = new Map<string, string>();
    const subDesc = new Map<string, string | null | undefined>();
    const subImage = new Map<string, string | null | undefined>();
    for (const c of categories) {
      catName.set(String(c.id), c.name);
      catDesc.set(String(c.id), c.description);
      catImage.set(String(c.id), c.image_url);
      for (const s of c.subcategories ?? []) {
        subName.set(String(s.id), s.name);
        subDesc.set(String(s.id), s.description);
        subImage.set(String(s.id), s.image_url);
      }
    }

    const cats = new Map<string, Map<string, VotableNominee[]>>();
    for (const campaign of campaigns) {
      for (const option of campaign.options ?? []) {
        const nominee = option.nominee;
        const cKey = nominee?.category_id != null
          ? String(nominee.category_id)
          : campaign.category_id != null
            ? String(campaign.category_id)
            : "other";
        const sKey = nominee?.subcategory_id != null ? String(nominee.subcategory_id) : NO_SUBCATEGORY;
        if (!cats.has(cKey)) cats.set(cKey, new Map());
        const subs = cats.get(cKey)!;
        if (!subs.has(sKey)) subs.set(sKey, []);
        subs.get(sKey)!.push({ campaign, option });
      }
    }

    // Most-voted first — the tally itself is only ever used to order these groups, never
    // rendered (nothing in the JSX below reads it).
    const votesFor = (nominees: VotableNominee[]) =>
      nominees.reduce((sum, n) => sum + (n.option.nominee?.votes_count ?? n.option.votes_count ?? 0), 0);

    const groups = Array.from(cats.entries()).map(([cKey, subs]) => {
      const subGroups: SubGroup[] = Array.from(subs.entries())
        .map(([sKey, nominees]) => ({
          id: sKey,
          label: sKey === NO_SUBCATEGORY ? "General" : subName.get(sKey) ?? "Subcategory",
          description: sKey === NO_SUBCATEGORY ? null : subDesc.get(sKey),
          image_url: sKey === NO_SUBCATEGORY ? null : subImage.get(sKey),
          nominees,
        }))
        .sort((a, b) => votesFor(b.nominees) - votesFor(a.nominees) || a.label.localeCompare(b.label));
      const total = subGroups.reduce((sum, s) => sum + s.nominees.length, 0);
      return {
        id: cKey,
        label: catName.get(cKey) ?? campaigns.find((c) => String(c.category_id) === cKey)?.category ?? "Other",
        description: catDesc.get(cKey),
        image_url: catImage.get(cKey),
        subs: subGroups,
        total,
        votes: subGroups.reduce((sum, s) => sum + votesFor(s.nominees), 0),
      };
    });

    return groups
      .sort((a, b) => b.votes - a.votes || a.label.localeCompare(b.label))
      .map(({ votes: _votes, ...group }) => group);
  }, [campaigns, categories]);

  const activeCat = catId ? tree.find((c) => c.id === catId) ?? null : null;
  const activeSub = activeCat && subId ? activeCat.subs.find((s) => s.id === subId) ?? null : null;

  async function pick(nominee: VotableNominee) {
    // Guests vote one nominee at a time via phone OTP + M-Pesa; account holders stage
    // vote slips in the cart and confirm them together.
    if (!user) {
      setGuestTarget(nominee);
      return;
    }
    setError(null);
    setPendingOptionId(nominee.option.id);
    try {
      await cartApi.addItem({ campaign_id: nominee.campaign.id, option_id: nominee.option.id });
      await refreshCart();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't add that pick to your vote slips.");
    } finally {
      setPendingOptionId(null);
    }
  }

  if (authLoading) return null;

  const cartCount = cart?.items.length ?? 0;

  return (
    <AppLayout>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cast your vote</h1>
          <p className="text-sm text-muted-foreground">
            Choose a category, then a subcategory, then your nominee.
          </p>
        </div>
        {cartCount > 0 && (
          <Link to="/cart" className="chip">
            <ShoppingBasket className="h-3 w-3" /> {cartCount} vote slip{cartCount === 1 ? "" : "s"}
          </Link>
        )}
      </div>

      {/* Breadcrumb */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5 text-sm">
        <button
          type="button"
          onClick={() => {
            setCatId(null);
            setSubId(null);
          }}
          className={catId ? "font-medium text-primary hover:underline" : "font-semibold text-foreground"}
        >
          Categories
        </button>
        {activeCat && (
          <>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <button
              type="button"
              onClick={() => setSubId(null)}
              className={subId ? "font-medium text-primary hover:underline" : "font-semibold text-foreground"}
            >
              {activeCat.label}
            </button>
          </>
        )}
        {activeSub && (
          <>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-foreground">{activeSub.label}</span>
          </>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-[color-mix(in_oklab,var(--destructive)_8%,transparent)] p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading categories…
        </div>
      ) : slugNotFound ? (
        <div className="fb-card p-6 text-sm text-muted-foreground">
          We couldn't find that subcategory — it may have been renamed or closed.{" "}
          <Link to="/vote" className="font-semibold text-primary hover:underline">
            Browse all categories
          </Link>
          .
        </div>
      ) : tree.length === 0 ? (
        <div className="fb-card p-6 text-sm text-muted-foreground">
          No live voting categories right now — check back soon.
        </div>
      ) : !activeCat ? (
        /* Step 1 — Categories, one row per card (matches the public Categories page). */
        <div className="flex flex-col gap-4">
          {tree.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setCatId(cat.id);
                setSubId(cat.subs.length === 1 ? cat.subs[0].id : null);
              }}
              className="fb-card fb-card-hover flex items-center gap-4 p-5 text-left"
            >
              <Avatar className="h-12 w-12 shrink-0 border border-border">
                <AvatarImage src={cat.image_url ?? undefined} alt={cat.label} />
                <AvatarFallback className="bg-secondary text-primary">
                  <Tags className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-foreground">{cat.label}</p>
                <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                  {cat.description || "No description yet."}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {cat.subs.length} subcategor{cat.subs.length === 1 ? "y" : "ies"} · {cat.total} nominee
                  {cat.total === 1 ? "" : "s"}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>
      ) : !activeSub ? (
        /* Step 2 — Subcategories, same row layout as categories. */
        <div className="flex flex-col gap-4">
          {activeCat.subs.map((sub) => (
            <button
              key={sub.id}
              type="button"
              onClick={() => setSubId(sub.id)}
              className="fb-card fb-card-hover flex items-center gap-4 p-5 text-left"
            >
              <Avatar className="h-12 w-12 shrink-0 border border-border">
                <AvatarImage src={sub.image_url ?? undefined} alt={sub.label} />
                <AvatarFallback className="bg-secondary text-primary">
                  <Tags className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-foreground">{sub.label}</p>
                <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                  {sub.description || "No description yet."}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {sub.nominees.length} nominee{sub.nominees.length === 1 ? "" : "s"}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>
      ) : (
        /* Step 3 — Nominees */
        <div>
          <button
            type="button"
            onClick={() => setSubId(null)}
            className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Back to subcategories
          </button>
          {/* One row per nominee, same layout as the categories/subcategories steps. */}
          <div className="flex flex-col gap-4">
            {activeSub.nominees.map(({ campaign, option }) => {
              const votedCount = voteCountByCampaign.get(String(campaign.id)) ?? 0;
              const carted = cartedOptionByCampaign.get(String(campaign.id)) === option.id;
              const isPending = pendingOptionId === option.id;
              const name = option.nominee?.name ?? option.label;
              const isHighlighted =
                highlightNomineeId != null && String(option.nominee?.id ?? "") === highlightNomineeId;
              return (
                <button
                  key={String(option.id)}
                  ref={(el) => {
                    if (isHighlighted && el && !highlightScrolledRef.current) {
                      highlightScrolledRef.current = true;
                      el.scrollIntoView({ behavior: "smooth", block: "center" });
                    }
                  }}
                  type="button"
                  disabled={isPending}
                  onClick={() => pick({ campaign, option })}
                  className={`fb-card fb-card-hover flex items-center gap-4 p-5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                    carted || isHighlighted ? "border-primary ring-2 ring-primary" : ""
                  }`}
                >
                  <Avatar className="h-12 w-12 shrink-0 border border-border">
                    <AvatarImage src={option.nominee?.avatar_url ?? undefined} alt={name} />
                    <AvatarFallback className="bg-secondary text-primary">
                      {name.slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-foreground">{name}</p>
                    <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                      {option.nominee?.tag || "No description yet."}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{campaign.title}</p>
                  </div>
                  {carted ? (
                    <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-accent">
                      <ShoppingBasket className="h-3.5 w-3.5" /> On slip
                    </span>
                  ) : isPending ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                  ) : votedCount > 0 ? (
                    <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-success">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Voted {votedCount}x
                    </span>
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {user && cartCount > 0 && (
        <div className="sticky bottom-4 mt-6 flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3 shadow-lg">
          <span className="text-sm text-muted-foreground">
            {cartCount} vote slip{cartCount === 1 ? "" : "s"} staged
          </span>
          <Link to="/cart" className="btn-accent">
            Review & confirm
          </Link>
        </div>
      )}

      {!user && !loading && tree.length > 0 && (
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Voting as a guest — pick a nominee to verify by phone.{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>{" "}
          to stage multiple votes and see your history.
        </p>
      )}

      {guestTarget && (
        <GuestVoteDialog
          open={!!guestTarget}
          onOpenChange={(o) => !o && setGuestTarget(null)}
          campaign={guestTarget.campaign}
          option={guestTarget.option}
          fee={fee}
        />
      )}
    </AppLayout>
  );
}
