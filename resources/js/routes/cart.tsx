import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, ShieldCheck, Trash2, XCircle } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { ShareSheet } from "@/components/ShareSheet";
import { buildStandings, formatEndsIn, type StoryCardStanding } from "@/components/StoryCard";
import { FeedbackPrompt } from "@/components/FeedbackPrompt";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { voteShareUrl } from "@/lib/voteLink";
import { cartApi, campaignsApi, ApiError } from "@/lib/api";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your Vote Slips — FansBench" },
      { name: "description", content: "Review your vote slips and pay a verification fee per vote to confirm all of them." },
    ],
  }),
  component: CartPage,
});

type GeoStatus = "idle" | "requesting" | "granted" | "denied" | "unsupported";
type CheckoutState = "idle" | "submitting" | "polling" | "success" | "failed";

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 60000;

function CartPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { cart, loading: cartLoading, refresh: refreshCart } = useCart();

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<GeoStatus>("idle");
  const savedPhone = user?.mpesa_phone || user?.phone || "";
  const [useDifferentNumber, setUseDifferentNumber] = useState(false);
  const [phone, setPhone] = useState("");

  // Prepopulate from the account's saved number once it loads — a signed-in fan shouldn't
  // have to retype it every checkout.
  useEffect(() => {
    if (savedPhone) setPhone(savedPhone);
  }, [savedPhone]);

  const [checkoutState, setCheckoutState] = useState<CheckoutState>("idle");
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | number | null>(null);
  // Captured before checkout empties the cart, so the success/share/feedback screen can use them.
  const [confirmedCount, setConfirmedCount] = useState(0);
  const [confirmedTxId, setConfirmedTxId] = useState<number | null>(null);
  const [feedbackOptions, setFeedbackOptions] = useState<string[]>([]);
  const [shareStandings, setShareStandings] = useState<StoryCardStanding[]>([]);
  const [shareCategory, setShareCategory] = useState<string | undefined>(undefined);
  const [shareCategoryId, setShareCategoryId] = useState<string | number | null>(null);
  const [shareSubcategoryId, setShareSubcategoryId] = useState<string | number | null>(null);
  const [shareSubcategorySlug, setShareSubcategorySlug] = useState<string | null>(null);
  const [shareTitle, setShareTitle] = useState<string | undefined>(undefined);
  const [shareEndsIn, setShareEndsIn] = useState<string | null>(null);
  const [shareTotalVotes, setShareTotalVotes] = useState(0);
  const [standingsAt, setStandingsAt] = useState<string>("");

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login", search: { redirect: "/cart" } });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoStatus("unsupported");
      return;
    }
    setGeoStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoStatus("granted");
      },
      () => setGeoStatus("denied"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  const groups = useMemo(() => {
    const byCategory = new Map<string, { label: string; items: NonNullable<typeof cart>["items"] }>();
    for (const item of cart?.items ?? []) {
      const label = item.campaign?.category ?? "Other";
      if (!byCategory.has(label)) byCategory.set(label, { label, items: [] });
      byCategory.get(label)!.items.push(item);
    }
    return Array.from(byCategory.values());
  }, [cart]);

  async function removeItem(itemId: string | number) {
    setRemovingId(itemId);
    try {
      await cartApi.removeItem(itemId);
      await refreshCart();
    } finally {
      setRemovingId(null);
    }
  }

  async function pollVerification(transactionId: number) {
    const start = Date.now();
    while (Date.now() - start < POLL_TIMEOUT_MS) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      try {
        const res = await cartApi.verifyCheckout(transactionId);
        if (res.status === "confirmed") {
          setCheckoutState("success");
          await refreshCart();
          return;
        }
        if (res.status === "failed") {
          setCheckoutState("failed");
          setCheckoutError("The M-Pesa payment wasn't completed. Please try checking out again.");
          return;
        }
      } catch {
        // keep polling until timeout
      }
    }
    setCheckoutState("failed");
    setCheckoutError("We couldn't confirm your payment in time. Check your phone, or try again.");
  }

  /**
   * Refreshes the share card's standings from the first campaign in this checkout batch —
   * the "category the person is sharing" — captured with a fresh timestamp.
   */
  async function loadShareStandings() {
    const first = cart?.items[0];
    if (!first?.campaign?.id) return;
    try {
      const fresh = await campaignsApi.get(first.campaign.id);
      const built = buildStandings(fresh.options ?? [], { highlightId: first.option?.id });
      setShareCategory(fresh.category ?? undefined);
      setShareCategoryId(fresh.category_id ?? null);
      setShareSubcategoryId(first.option?.nominee?.subcategory_id ?? null);
      setShareSubcategorySlug(first.option?.nominee?.subcategory_slug ?? null);
      setShareTitle(fresh.title);
      setShareEndsIn(formatEndsIn(fresh.closes_at));
      setShareStandings(built.standings);
      setShareTotalVotes(built.totalVotes);
      setStandingsAt(new Date().toISOString());
    } catch {
      // best effort — the share card falls back to the aggregate stat
    }
  }

  async function checkout() {
    setCheckoutError(null);
    setConfirmedCount(cart?.items.length ?? 0);
    // Union of any preset feedback prompts across the campaigns in this batch.
    setFeedbackOptions(
      Array.from(new Set((cart?.items ?? []).flatMap((i) => i.campaign?.feedback_options ?? []))),
    );
    await loadShareStandings();
    setCheckoutState("submitting");
    try {
      const res = await cartApi.checkout({
        mpesa_phone: phone || undefined,
        latitude: coords?.lat,
        longitude: coords?.lng,
      });
      if (res.transaction_id) {
        setConfirmedTxId(res.transaction_id);
        setCheckoutState("polling");
        await pollVerification(res.transaction_id);
      } else {
        setCheckoutState("success");
        await refreshCart();
      }
    } catch (err) {
      setCheckoutState("failed");
      setCheckoutError(err instanceof ApiError ? err.message : "Checkout failed. Please try again.");
    }
  }

  if (authLoading || !user) return null;

  if (checkoutState === "success") {
    // Deep-links to the first campaign in this checkout batch — same "representative
    // category" convention loadShareStandings() already uses for the share card's visuals.
    const shareUrl = voteShareUrl({
      categoryId: shareCategoryId,
      subcategoryId: shareSubcategoryId,
      subcategorySlug: shareSubcategorySlug,
    });
    return (
      <AppLayout>
        <div className="fb-card flex flex-col items-center gap-3 p-10 text-center">
          <CheckCircle2 className="h-10 w-10 text-success" />
          <h1 className="text-xl font-bold text-foreground">All your votes are verified</h1>
          <p className="text-sm text-muted-foreground">
            Thanks — every slip in that batch is now confirmed. Share your verified votes,
            or head to the leaderboard to see them reflected.
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            <ShareSheet
              className="btn-accent"
              url={shareUrl}
              text={`I just cast ${confirmedCount} verified vote${confirmedCount === 1 ? "" : "s"} on FansBench`}
              story={{
                title: shareTitle ?? `${confirmedCount} verified vote${confirmedCount === 1 ? "" : "s"} cast`,
                category: shareCategory ?? "FansBench",
                endsIn: shareEndsIn,
                statLabel: confirmedCount === 1 ? "verified vote" : "verified votes",
                statValue: confirmedCount,
                url: shareUrl,
                standings: shareStandings,
                totalVotes: shareTotalVotes,
                generatedAt: standingsAt || new Date().toISOString(),
              }}
            />
            <Link to="/leaderboard" className="btn-outline">
              View leaderboard
            </Link>
          </div>
          {confirmedTxId && (
            <div className="mt-4 w-full max-w-sm">
              <FeedbackPrompt
                options={feedbackOptions}
                onSubmit={(feedback) =>
                  cartApi.submitFeedback({ transaction_id: confirmedTxId, feedback }).then(() => undefined)
                }
              />
            </div>
          )}
        </div>
      </AppLayout>
    );
  }

  const hasItems = !!cart?.items.length;

  return (
    <AppLayout>
      <h1 className="mb-1 text-2xl font-bold text-foreground">Your Vote Slips</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Review your vote slips, then pay a verification fee for each one to confirm them all at once.
      </p>

      {cartLoading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading your cart…
        </div>
      ) : !hasItems ? (
        <div className="fb-card p-6 text-sm text-muted-foreground">
          You have no vote slips yet.{" "}
          <Link to="/vote" className="font-semibold text-primary hover:underline">
            Browse what you can vote on
          </Link>
          .
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <section key={group.label} className="fb-card p-5">
              <h2 className="mb-3 text-sm font-semibold text-foreground">{group.label}</h2>
              <ul className="divide-y divide-border">
                {group.items.map((item) => (
                  <li key={String(item.id)} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {item.option?.nominee?.name ?? item.option?.label}
                      </p>
                      <p className="text-xs text-muted-foreground">{item.campaign?.title}</p>
                    </div>
                    <button
                      type="button"
                      disabled={removingId === item.id}
                      onClick={() => removeItem(item.id)}
                      className="btn-ghost text-destructive"
                      aria-label="Remove"
                    >
                      {removingId === item.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <section className="fb-card p-5">
            <div className="mb-3">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">M-Pesa phone number</label>
              {savedPhone && !useDifferentNumber ? (
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" checked readOnly />
                    Use {savedPhone} to confirm this payment
                  </label>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="radio"
                      checked={false}
                      onChange={() => {
                        setUseDifferentNumber(true);
                        setPhone("");
                      }}
                    />
                    Use a different Mobile Number for M-Pesa
                  </label>
                </div>
              ) : (
                <>
                  {savedPhone && (
                    <label className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                      <input
                        type="radio"
                        checked={false}
                        onChange={() => {
                          setUseDifferentNumber(false);
                          setPhone(savedPhone);
                        }}
                      />
                      Use {savedPhone} instead
                    </label>
                  )}
                  <input
                    type="tel"
                    className="fb-input"
                    placeholder="07XX XXX XXX"
                    autoFocus={Boolean(savedPhone)}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {geoStatus === "granted" && "Device location captured for verification."}
              {geoStatus === "requesting" && "Requesting device location…"}
              {geoStatus === "denied" && "Precise location declined — your votes will be tagged with an approximate location from your connection."}
              {geoStatus === "unsupported" && "Location isn't supported on this device."}
            </p>

            <div className="mt-4 rounded-md border border-border bg-surface-muted p-3 text-sm text-foreground">
              You will receive an M-Pesa prompt for{" "}
              <strong>KSH {(cart?.fee ?? 0) * (cart?.items.length ?? 0)}</strong> — KSH{" "}
              {cart?.fee ?? 0} × {cart?.items.length} vote{cart?.items.length === 1 ? "" : "s"} selected.
            </div>

            {checkoutError && (
              <div className="mt-3 flex items-center gap-2 rounded-md border border-destructive/30 bg-[color-mix(in_oklab,var(--destructive)_8%,transparent)] p-3 text-sm text-destructive">
                <XCircle className="h-4 w-4 shrink-0" /> {checkoutError}
              </div>
            )}

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                One payment authenticates every vote slip in this batch
              </div>
              <button
                disabled={checkoutState === "submitting" || checkoutState === "polling"}
                onClick={checkout}
                className="btn-accent w-full sm:w-auto"
              >
                {checkoutState === "submitting" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Sending STK push…
                  </>
                ) : checkoutState === "polling" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Check your phone…
                  </>
                ) : (
                  "Confirm"
                )}
              </button>
            </div>
          </section>
        </div>
      )}
    </AppLayout>
  );
}
