import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  Heart,
  MessageCircle,
  MessagesSquare,
  CheckCircle2,
  TrendingUp,
  Users,
  BarChart3,
  Loader2,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { ShareSheet } from "@/components/ShareSheet";
import { buildStandings, formatEndsIn } from "@/components/StoryCard";
import { UniversalSearch } from "@/components/UniversalSearch";
import { Logo } from "@/components/Logo";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { voteShareUrl } from "@/lib/voteLink";
import {
  categoriesApi,
  statsApi,
  campaignsApi,
  feedApi,
  commentsApi,
  type CategoryBoardEntry,
  type Campaign,
  type Post,
  type Comment as CommentType,
} from "@/lib/api";

type HomeSearch = { post?: string };

export const Route = createFileRoute("/")({
  // ?post=<id> deep-links a feed post — e.g. after signing in from "Sign in to comment".
  validateSearch: (search: Record<string, unknown>): HomeSearch => ({
    post: typeof search.post === "string" ? search.post : undefined,
  }),
  head: () => ({
    meta: [
      { title: "FansBench" },
      {
        name: "description",
        content:
          "The trusted feed for verified fan engagement. Vote in awards, back your favorites, and prove influence with M-Pesa-verified voting.",
      },
      { property: "og:title", content: "FansBench" },
      {
        property: "og:description",
        content:
          "Feed-first platform for transparent fan voting, leaderboards, and reputation.",
      },
    ],
  }),
  component: Home,
});

function formatCount(n: number): string {
  return n.toLocaleString();
}

function Home() {
  const { user } = useAuth();
  const { post: focusPostId } = Route.useSearch();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [showAllPosts, setShowAllPosts] = useState(false);
  const FEED_PREVIEW_COUNT = 3;
  const [heroStats, setHeroStats] = useState({
    verified_voters: 0,
    active_campaigns: 0,
    organizations: 0,
  });

  useEffect(() => {
    statsApi.public().then(setHeroStats).catch(() => {});
    campaignsApi
      .list({ status: "live", visibility: "public" })
      .then((r) => setCampaigns(r.data))
      .catch(() => setCampaigns([]))
      .finally(() => setCampaignsLoading(false));
    feedApi
      .list()
      .then((r) => setPosts(r.data))
      .catch(() => setPosts([]))
      .finally(() => setPostsLoading(false));
  }, []);

  function updatePost(id: Post["id"], patch: Partial<Post>) {
    // Post and Conversation ids come from separate tables and can collide, so only patch
    // actual posts — conversations never trigger like/comment updates (see PostCard).
    setPosts((cur) => cur.map((p) => (p.id === id && p.type !== "conversation" ? { ...p, ...patch } : p)));
  }

  return (
    <AppLayout>
      {!user && <CategoryBoard />}
      {/* Hero */}
      <section className="fb-card mb-4 overflow-hidden">
        <div className="bg-linear-to-r from-primary to-[#084E96] px-6 py-8 text-white">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/70">
            Verified fan engagement
          </p>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
            Every vote counts. Every vote is verified.
          </h1>
          <p className="mt-2 max-w-xl text-sm text-white/85">
            Back your favorite artists, athletes and brands — with M-Pesa &
            Dual-OTP verification that keeps rankings honest.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/register" className="btn-accent">
              Create Account
            </Link>
          </div>
          <div className="mt-5 max-w-xl">
            <UniversalSearch
              size="lg"
              placeholder="Search your nominee"
            />
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-border">
          <Stat icon={CheckCircle2} label="Verified voters" value={formatCount(heroStats.verified_voters)} />
          <Stat icon={TrendingUp} label="Active campaigns" value={formatCount(heroStats.active_campaigns)} />
          <Stat icon={Users} label="Partner orgs" value={formatCount(heroStats.organizations)} />
        </div>
      </section>

      {/* Live voting */}
      {!campaignsLoading && campaigns.length > 0 && (
        <div className="mb-6 flex flex-col gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Live voting
          </h2>
          {campaigns.map((c) => (
            <VotingCard key={String(c.id)} campaign={c} />
          ))}
        </div>
      )}

      {/* Community feed */}
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Community feed
      </h2>
      <div className="flex flex-col gap-4">
        {postsLoading ? (
          <p className="text-sm text-muted-foreground">Loading feed…</p>
        ) : posts.length === 0 ? (
          <div className="fb-card p-6 text-sm text-muted-foreground">
            No posts yet — be the first to share something.
          </div>
        ) : (
          (showAllPosts ? posts : posts.slice(0, FEED_PREVIEW_COUNT)).map((post) => (
            <PostCard
              key={`${post.type ?? "post"}-${post.id}`}
              post={post}
              defaultCommentsOpen={
                focusPostId != null && String(post.id) === focusPostId && post.type !== "conversation"
              }
              onChange={(patch) => updatePost(post.id, patch)}
            />
          ))
        )}
        {!postsLoading && !showAllPosts && posts.length > FEED_PREVIEW_COUNT && (
          <button
            type="button"
            onClick={() => setShowAllPosts(true)}
            className="text-sm font-semibold text-primary hover:underline"
          >
            See more ({posts.length - FEED_PREVIEW_COUNT} more)
          </button>
        )}
      </div>
    </AppLayout>
  );
}

function CategoryBoard() {
  const [rows, setRows] = useState<CategoryBoardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    categoriesApi
      .board()
      .then((r) => setRows(r.data))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  const max = Math.max(1, ...rows.map((r) => r.verified_votes));

  return (
    <section className="fb-card mb-4 p-5">
      <div className="mb-1 flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-primary" />
        <h2 className="text-base font-semibold text-foreground">Votes cast per category</h2>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Live, verified vote totals across FansBench — sign in to add your own.
      </p>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No verified votes yet.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={String(row.id)}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{row.name}</span>
                <span className="text-muted-foreground">{row.verified_votes.toLocaleString()}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${(row.verified_votes / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CheckCircle2;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="rounded-full bg-secondary p-2 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function VotingCard({ campaign }: { campaign: Campaign }) {
  // Candidates shown highest → lowest by verified votes.
  const options = [...(campaign.options ?? [])].sort(
    (a, b) => (b.votes_count ?? 0) - (a.votes_count ?? 0),
  );
  const total = options.reduce((sum, o) => sum + (o.votes_count ?? 0), 0);
  const endsIn = formatEndsIn(campaign.closes_at);
  // Only pin a subcategory when every nominee here shares one — otherwise leave it to /vote's
  // own "auto-pick if there's just one" step so the fan still lands in the right category.
  const subcategoryIds = new Set(
    options.map((o) => o.nominee?.subcategory_id).filter((id): id is string | number => id != null),
  );
  const subcategorySlugs = new Set(
    options.map((o) => o.nominee?.subcategory_slug).filter((s): s is string => !!s),
  );
  const shareUrl = voteShareUrl({
    categoryId: campaign.category_id,
    subcategoryId: subcategoryIds.size === 1 ? [...subcategoryIds][0] : null,
    subcategorySlug: subcategorySlugs.size === 1 ? [...subcategorySlugs][0] : null,
  });

  return (
    <article className="fb-card fb-card-hover overflow-hidden">
      <header className="flex items-center justify-between px-5 pt-4">
        <div className="flex items-center gap-2">
          <span className="chip">{campaign.category ?? "Live"}</span>
          {endsIn && <span className="text-xs font-medium text-accent">{endsIn}</span>}
        </div>
        <Logo size={18} />
      </header>
      <div className="px-5 pt-2 pb-4">
        <h2 className="text-lg font-semibold text-foreground">{campaign.title}</h2>
        {options.length > 0 && (
          <ul className="mt-4 space-y-3">
            {options.map((o) => {
              const pct = total > 0 ? Math.round(((o.votes_count ?? 0) / total) * 100) : 0;
              return (
                <li key={String(o.id)}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{o.nominee?.name ?? o.label}</span>
                    <span className="text-muted-foreground">{pct}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <Link to="/vote" className="btn-accent mt-4 inline-flex w-full sm:w-auto">
          Cast verified vote
        </Link>
      </div>
      <footer className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted-foreground">
        <span>{total.toLocaleString()} verified votes</span>
        <ShareSheet
          url={shareUrl}
          text={`Vote for your favorite in "${campaign.title}" on FansBench`}
          story={{
            title: campaign.title,
            category: campaign.category ?? undefined,
            endsIn,
            statLabel: "verified votes",
            statValue: total.toLocaleString(),
            url: shareUrl,
            ...buildStandings(options),
            generatedAt: new Date().toISOString(),
          }}
        />
      </footer>
    </article>
  );
}

function PostCard({
  post,
  onChange,
  defaultCommentsOpen = false,
}: {
  post: Post;
  onChange: (patch: Partial<Post>) => void;
  defaultCommentsOpen?: boolean;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [commentsOpen, setCommentsOpen] = useState(defaultCommentsOpen);
  const [comments, setComments] = useState<CommentType[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [liking, setLiking] = useState(false);
  const isConversation = post.type === "conversation";

  // Where to send a logged-out fan so they land back on this post's comments after signing in.
  const loginSearch = { redirect: `/?post=${post.id}` };

  useEffect(() => {
    if (commentsOpen && !commentsLoaded) {
      commentsApi
        .list(post.id)
        .then((res) => setComments(res.data))
        .catch(() => setComments([]))
        .finally(() => setCommentsLoaded(true));
    }
  }, [commentsOpen, commentsLoaded, post.id]);

  async function toggleLike() {
    if (!user) {
      navigate({ to: "/login", search: loginSearch });
      return;
    }
    setLiking(true);
    try {
      const res = post.liked_by_me ? await feedApi.unlike(post.id) : await feedApi.like(post.id);
      onChange({ likes: res.likes, liked_by_me: !post.liked_by_me });
    } catch {
      // ignore
    } finally {
      setLiking(false);
    }
  }

  function openComments() {
    setCommentsOpen(true); // the effect above lazy-loads comments on first open
  }

  async function submitComment(e: FormEvent) {
    e.preventDefault();
    if (!user) {
      navigate({ to: "/login", search: loginSearch });
      return;
    }
    if (!commentBody.trim()) return;
    setPosting(true);
    try {
      const created = await commentsApi.create(post.id, commentBody.trim());
      setComments((c) => [...c, created]);
      setCommentBody("");
      onChange({ comments: post.comments + 1 });
    } catch {
      // ignore
    } finally {
      setPosting(false);
    }
  }

  const initials = post.author
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  return (
    <article className="fb-card fb-card-hover overflow-hidden">
      <header className="flex items-center gap-3 px-5 pt-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-primary">
          {initials}
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            {post.author}
            {isConversation && <span className="font-normal text-muted-foreground"> started a conversation</span>}
          </p>
          <p className="text-xs text-muted-foreground">{post.organization ?? post.author_role}</p>
        </div>
      </header>
      <div className="px-5 pt-2 pb-4">
        {isConversation ? (
          <Link
            to="/conversations/$id"
            params={{ id: String(post.id) }}
            className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary hover:underline"
          >
            <MessagesSquare className="h-4 w-4 shrink-0 text-primary" />
            {post.body}
          </Link>
        ) : (
          <p className="text-sm text-foreground/90">{post.body}</p>
        )}
        {post.image_url && (
          <img src={post.image_url} alt="" className="mt-3 max-h-96 w-full rounded-xl object-cover" />
        )}
      </div>
      <footer className="flex items-center gap-1 border-t border-border px-5 py-3 text-muted-foreground">
        {isConversation ? (
          <Link
            to="/conversations/$id"
            params={{ id: String(post.id) }}
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 hover:bg-surface-muted hover:text-foreground"
            aria-label="Join the conversation"
          >
            <MessageCircle className="h-4 w-4" />
            {post.comments > 0 && <span className="text-xs">{post.comments}</span>}
          </Link>
        ) : (
          <button
            onClick={openComments}
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 hover:bg-surface-muted hover:text-foreground"
            aria-label="Comment"
          >
            <MessageCircle className="h-4 w-4" />
            {post.comments > 0 && <span className="text-xs">{post.comments}</span>}
          </button>
        )}
        {!isConversation && (
          <button
            onClick={toggleLike}
            disabled={liking}
            className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 hover:bg-surface-muted ${
              post.liked_by_me ? "text-primary" : "hover:text-foreground"
            }`}
            aria-label="Like"
          >
            <Heart className={`h-4 w-4 ${post.liked_by_me ? "fill-current" : ""}`} />
            {post.likes > 0 && <span className="text-xs">{post.likes}</span>}
          </button>
        )}
      </footer>

      {!isConversation && (
        <Dialog open={commentsOpen} onOpenChange={setCommentsOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Replying to {post.author}</DialogTitle>
            </DialogHeader>
            <div className="flex gap-3 border-b border-border pb-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-primary">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{post.author}</p>
                <p className="text-sm text-foreground/90">{post.body}</p>
              </div>
            </div>

            <div className="max-h-64 space-y-3 overflow-y-auto">
              {!commentsLoaded ? (
                <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading comments…
                </div>
              ) : comments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No comments yet — start the conversation.</p>
              ) : (
                comments.map((c) => (
                  <div key={String(c.id)} className="text-sm">
                    <span className="font-semibold text-foreground">{c.author}</span>{" "}
                    <span className="text-foreground/80">{c.body}</span>
                  </div>
                ))
              )}
            </div>

            {user ? (
              <form onSubmit={submitComment} className="flex gap-2 border-t border-border pt-3">
                <input
                  className="fb-input flex-1"
                  placeholder="Post your reply"
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  maxLength={1000}
                />
                <button type="submit" disabled={posting || !commentBody.trim()} className="btn-accent">
                  {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reply"}
                </button>
              </form>
            ) : (
              <div className="flex flex-col items-center gap-2 border-t border-border pt-3 text-center">
                <p className="text-sm text-muted-foreground">Sign in to join the conversation.</p>
                <Link to="/login" search={loginSearch} className="btn-accent">
                  Sign in to comment
                </Link>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </article>
  );
}
