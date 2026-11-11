import { forwardRef, type ReactNode } from "react";
import { Share2 } from "lucide-react";
import { formatVotes } from "@/lib/format";

export type StoryCardStanding = {
  name: string;
  votes: number;
  percent: number;
  highlighted?: boolean;
};

export type StoryCardData = {
  title: string;
  category?: string;
  /** e.g. "3 days left" — see formatEndsIn(). Omitted once voting has closed. */
  endsIn?: string | null;
  url: string;
  /** Ranked nominees for the category being shared, mirroring the live voting card. Omit for non-voting shares (e.g. a feed post). */
  standings?: StoryCardStanding[];
  totalVotes?: number;
  /** ISO timestamp of when this card's numbers were generated. */
  generatedAt?: string;
  /** Fallback single-stat display used when there's no nominee list to show (e.g. a feed post share). */
  statLabel: string;
  statValue: string | number;
};

/**
 * Ranks a campaign's options by votes and returns the top N plus each one's share of the
 * total, always keeping `highlightId` (the nominee this share is about) in the list even if
 * it falls outside the top N.
 */
export function buildStandings(
  options: Array<{ id: string | number; label: string; votes_count?: number; nominee?: { name: string } | null }>,
  { highlightId, limit = 6 }: { highlightId?: string | number; limit?: number } = {},
): { standings: StoryCardStanding[]; totalVotes: number } {
  const totalVotes = options.reduce((sum, o) => sum + (o.votes_count ?? 0), 0);
  const ranked = [...options]
    .sort((a, b) => (b.votes_count ?? 0) - (a.votes_count ?? 0))
    .map((o) => ({
      name: o.nominee?.name ?? o.label,
      votes: o.votes_count ?? 0,
      percent: totalVotes > 0 ? Math.round(((o.votes_count ?? 0) / totalVotes) * 100) : 0,
      highlighted: highlightId != null && String(o.id) === String(highlightId),
    }));

  const top = ranked.slice(0, limit);
  if (highlightId != null && !top.some((r) => r.highlighted)) {
    const highlighted = ranked.find((r) => r.highlighted);
    if (highlighted) top.push(highlighted);
  }
  return { standings: top, totalVotes };
}

/** Days-left label shown on both the live voting card and its shared image. */
export function formatEndsIn(closesAt?: string | null): string | null {
  if (!closesAt) return null;
  const diffMs = new Date(closesAt).getTime() - Date.now();
  if (diffMs <= 0) return null;
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return days <= 1 ? "Ends today" : `${days} days left`;
}

function formatGeneratedAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-KE", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/** Oversized, low-opacity FansBench marks behind the card content — a watermark instead of flat white. */
function CardWatermark() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[48px]" aria-hidden>
      <div className="absolute -right-28 -top-28 rotate-12 opacity-[0.06]">
        <img src="/fansbench-brand.png" alt="" style={{ height: 560, width: "auto" }} />
      </div>
      <div className="absolute -bottom-36 -left-24 -rotate-6 opacity-[0.05]">
        <img src="/fansbench-brand.png" alt="" style={{ height: 460, width: "auto" }} />
      </div>
    </div>
  );
}

/** Card shell shared by both the standings and fallback layouts: branded gradient + logo watermark. */
function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div className="relative flex-1 overflow-hidden rounded-[48px] bg-gradient-to-br from-white via-secondary/50 to-white shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
      <CardWatermark />
      <div className={`relative flex h-full flex-col justify-between ${className}`}>{children}</div>
    </div>
  );
}

/**
 * Offscreen 1080x1920 (Instagram/WhatsApp story ratio) card, captured to JPG by ShareSheet.
 * Mirrors the on-site live voting card (chip + days left, nominee bars, verified-vote count)
 * so the shared image matches what the sharer is actually looking at, with a generated-at
 * timestamp for the numbers, on a branded FansBench-watermarked background instead of flat white.
 */
export const StoryCard = forwardRef<HTMLDivElement, { data: StoryCardData }>(function StoryCard(
  { data },
  ref,
) {
  const hasStandings = !!data.standings?.length;

  return (
    <div
      ref={ref}
      style={{ width: 1080, height: 1920 }}
      className="flex flex-col bg-surface-muted p-16"
    >
      <div className="flex items-center gap-3">
        <img src="/fansbench-brand.png" alt="FansBench" style={{ height: 64, width: "auto" }} />
      </div>

      {hasStandings ? (
        <>
          <p className="mb-6 mt-12 text-2xl font-semibold uppercase tracking-widest text-muted-foreground">
            Live voting
          </p>
          <Card className="p-14">
            <div>
              <div className="flex items-center gap-4">
                {data.category && (
                  <span className="rounded-full bg-secondary px-6 py-3 text-2xl font-semibold text-primary">
                    {data.category}
                  </span>
                )}
                {data.endsIn && <span className="text-2xl font-semibold text-accent">{data.endsIn}</span>}
              </div>
              <p className="mt-8 text-5xl font-bold leading-tight text-foreground">{data.title}</p>

              <div className="mt-12 space-y-8">
                {data.standings!.map((s) => (
                  <div key={s.name}>
                    <div className="flex items-center justify-between gap-4 text-3xl">
                      <span
                        className={`truncate ${s.highlighted ? "font-bold text-primary" : "font-semibold text-foreground"}`}
                      >
                        {s.name}
                      </span>
                      <span className="shrink-0 text-muted-foreground">{s.percent}%</span>
                    </div>
                    <div className="mt-3 h-4 w-full overflow-hidden rounded-full bg-border">
                      <div
                        className={`h-full rounded-full ${s.highlighted ? "bg-accent" : "bg-primary"}`}
                        style={{ width: `${s.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-14 inline-flex items-center justify-center rounded-full bg-accent px-16 py-7 text-3xl font-bold text-white">
                Cast verified vote
              </div>
            </div>

            <div className="relative mt-14 flex items-center justify-between border-t border-border pt-8 text-2xl">
              <span className="font-semibold text-accent">
                {formatVotes(data.totalVotes ?? 0)} verified votes
              </span>
              <span className="flex items-center gap-2 font-semibold text-foreground">
                <Share2 className="h-6 w-6" /> Share
              </span>
            </div>
          </Card>
        </>
      ) : (
        <div className="mt-12 flex flex-1 flex-col">
          <Card className="p-14">
            <div>
              {data.category && (
                <p className="mb-4 text-2xl font-semibold uppercase tracking-widest text-muted-foreground">
                  {data.category}
                </p>
              )}
              <p className="text-5xl font-bold leading-tight text-foreground">{data.title}</p>
              <div className="mt-14 inline-flex items-baseline gap-4 rounded-3xl bg-secondary px-10 py-8">
                <span className="text-8xl font-bold text-primary">{data.statValue}</span>
                <span className="text-3xl text-muted-foreground">{data.statLabel}</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      <div className="mt-10 text-2xl text-muted-foreground">
        {data.generatedAt && <p className="mb-2">Generated {formatGeneratedAt(data.generatedAt)}</p>}
        <p>Verified voting, powered by FansBench</p>
        <p className="mt-2 break-all font-semibold text-foreground">{data.url}</p>
      </div>
    </div>
  );
});
