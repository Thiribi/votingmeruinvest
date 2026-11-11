import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ShareSheet } from "@/components/ShareSheet";
import { buildStandings, formatEndsIn, type StoryCardStanding } from "@/components/StoryCard";
import { FeedbackPrompt } from "@/components/FeedbackPrompt";
import { voteShareUrl } from "@/lib/voteLink";
import { useWebOtp } from "@/lib/useWebOtp";
import {
  guestVoteApi,
  campaignsApi,
  ApiError,
  type Campaign,
  type CampaignOption,
} from "@/lib/api";

type Step = "phone" | "otp" | "paying" | "success" | "failed";

const OTP_LENGTH = 4;

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 60000;

/**
 * Guest (no-account) single-vote flow: phone → OTP → M-Pesa payment → confirmation.
 * Mirrors the account checkout's verification fee, keyed to the OTP-verified phone.
 */
export function GuestVoteDialog({
  open,
  onOpenChange,
  campaign,
  option,
  fee,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: Campaign;
  option: CampaignOption;
  fee: number;
}) {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [transactionId, setTransactionId] = useState<number | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [standings, setStandings] = useState<StoryCardStanding[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [standingsAt, setStandingsAt] = useState<string>("");
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendNote, setResendNote] = useState<string | null>(null);

  // Auto-fills straight from the SMS on supporting browsers — the guest voter never has to
  // leave the dialog to open Messages at all. Only listens while the OTP step is showing.
  useWebOtp(
    useCallback((code: string) => {
      const digits = code.replace(/\D/g, "").slice(0, OTP_LENGTH);
      if (digits.length === OTP_LENGTH) setOtp(digits);
    }, []),
    step === "otp",
  );

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  useEffect(() => {
    if (!open) return;
    // Reset each time it opens.
    setStep("phone");
    setPhone("");
    setEmail("");
    setMpesaPhone("");
    setOtp("");
    setChallengeId("");
    setError(null);
    setResendCooldown(0);
    setResendNote(null);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setCoords(null),
        { enableHighAccuracy: false, timeout: 10000 },
      );
    }
  }, [open]);

  async function sendOtp() {
    setError(null);
    if (!/^\+?\d{9,15}$/.test(phone.replace(/\s/g, ""))) {
      return setError("Enter a valid phone number (e.g. +254…).");
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return setError("Enter a valid backup email, or leave it blank.");
    }
    setBusy(true);
    try {
      const res = await guestVoteApi.sendOtp(phone, email.trim());
      setChallengeId(res.challenge_id);
      if (!mpesaPhone) setMpesaPhone(phone);
      setStep("otp");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't send the code. Try again.");
    } finally {
      setBusy(false);
    }
  }

  /** Requests a fresh code on the same phone — for an expired, already-used, or never-arrived code. */
  async function resendCode() {
    setError(null);
    setResendNote(null);
    setResending(true);
    try {
      const res = await guestVoteApi.sendOtp(phone, email.trim());
      setChallengeId(res.challenge_id);
      setOtp("");
      setResendNote("A new code is on its way.");
      setResendCooldown(30);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't resend the code. Try again.");
    } finally {
      setResending(false);
    }
  }

  async function pollStatus(transactionId: number) {
    const start = Date.now();
    while (Date.now() - start < POLL_TIMEOUT_MS) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      try {
        const res = await guestVoteApi.status(transactionId, mpesaPhone);
        if (res.status === "confirmed") {
          // Pull fresh vote counts for the share card's standings, captured right now.
          campaignsApi
            .get(campaign.id)
            .then((fresh) => {
              const built = buildStandings(fresh.options ?? [], { highlightId: option.id });
              setStandings(built.standings);
              setTotalVotes(built.totalVotes);
              setStandingsAt(new Date().toISOString());
            })
            .catch(() => {});
          return setStep("success");
        }
        if (res.status === "failed") {
          setError("The M-Pesa payment wasn't completed.");
          return setStep("failed");
        }
      } catch {
        // keep polling
      }
    }
    setError("We couldn't confirm your payment in time. Check your phone, or try again.");
    setStep("failed");
  }

  async function castVote() {
    setError(null);
    if (otp.trim().length !== OTP_LENGTH) return setError(`Enter the ${OTP_LENGTH}-digit code.`);
    if (!/^\+?\d{9,15}$/.test(mpesaPhone.replace(/\s/g, ""))) {
      return setError("Enter a valid M-Pesa phone number.");
    }
    setBusy(true);
    try {
      const res = await guestVoteApi.cast({
        challenge_id: challengeId,
        otp: otp.trim(),
        campaign_id: campaign.id,
        option_id: option.id,
        mpesa_phone: mpesaPhone,
        latitude: coords?.lat,
        longitude: coords?.lng,
      });
      setTransactionId(res.transaction_id);
      setStep("paying");
      await pollStatus(res.transaction_id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't cast your vote. Try again.");
      setStep("otp");
    } finally {
      setBusy(false);
    }
  }

  const nomineeName = option.nominee?.name ?? option.label;
  const shareUrl = voteShareUrl({
    categoryId: option.nominee?.category_id ?? campaign.category_id,
    subcategoryId: option.nominee?.subcategory_id,
    subcategorySlug: option.nominee?.subcategory_slug,
    nomineeId: option.nominee?.id,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Vote for {nomineeName}</DialogTitle>
          <DialogDescription>{campaign.title}</DialogDescription>
        </DialogHeader>

        {step === "phone" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Vote as a guest — we'll send a one-time code to your phone to verify it's really you.
            </p>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Your phone number</label>
              <input
                className="fb-input"
                placeholder="+254 7XX XXX XXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Backup email <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <input
                type="email"
                className="fb-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                We'll also send the code here in case the SMS doesn't arrive.
              </p>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button onClick={sendOtp} disabled={busy} className="btn-accent w-full">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send code"}
            </button>
          </div>
        )}

        {step === "otp" && (
          <div className="space-y-3">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-sm font-medium">{OTP_LENGTH}-digit code</label>
                <button
                  type="button"
                  onClick={resendCode}
                  disabled={resending || resendCooldown > 0}
                  className="text-xs font-semibold text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
                >
                  {resending
                    ? "Sending…"
                    : resendCooldown > 0
                      ? `Resend code (${resendCooldown}s)`
                      : "Resend code"}
                </button>
              </div>
              <input
                className="fb-input tracking-[0.4em]"
                inputMode="numeric"
                maxLength={OTP_LENGTH}
                placeholder={"_".repeat(OTP_LENGTH)}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))}
                autoComplete="one-time-code"
              />
              {resendNote && <p className="mt-1 text-xs text-success">{resendNote}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">M-Pesa phone number</label>
              <input
                className="fb-input"
                placeholder="07XX XXX XXX"
                value={mpesaPhone}
                onChange={(e) => setMpesaPhone(e.target.value)}
                autoComplete="tel"
              />
            </div>
            <div className="rounded-md border border-border bg-surface-muted p-3 text-sm text-foreground">
              You will receive an M-Pesa prompt to pay a verification fee of{" "}
              <strong>KSH {fee}</strong> for your 1 vote selected.
            </div>
            {error && (
              <p className="text-sm text-destructive">
                {error}
                {(error.includes("already been used") || error.includes("expired")) && (
                  <>
                    {" "}
                    <button type="button" onClick={resendCode} className="font-semibold underline">
                      Send a new code
                    </button>
                  </>
                )}
              </p>
            )}
            <button onClick={castVote} disabled={busy} className="btn-accent w-full">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm & pay"}
            </button>
          </div>
        )}

        {step === "paying" && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-foreground">Check your phone…</p>
            <p className="text-xs text-muted-foreground">
              Enter your M-Pesa PIN on the STK prompt to confirm your vote.
            </p>
          </div>
        )}

        {step === "success" && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle2 className="h-10 w-10 text-success" />
            <p className="font-semibold text-foreground">Your vote is verified!</p>
            <p className="text-sm text-muted-foreground">
              Thanks for voting for {nomineeName}. Create an account to track your voting history.
            </p>
            {transactionId && (
              <FeedbackPrompt
                options={campaign.feedback_options ?? []}
                onSubmit={(feedback) =>
                  guestVoteApi
                    .submitFeedback({ transaction_id: transactionId, phone: mpesaPhone, feedback })
                    .then(() => undefined)
                }
              />
            )}
            <ShareSheet
              className="btn-accent"
              url={shareUrl}
              text={`I just voted for ${nomineeName} on FansBench`}
              story={{
                title: campaign.title,
                category: campaign.category ?? "FansBench",
                endsIn: formatEndsIn(campaign.closes_at),
                statLabel: "verified vote",
                statValue: 1,
                url: shareUrl,
                standings,
                totalVotes,
                generatedAt: standingsAt || new Date().toISOString(),
              }}
            />
          </div>
        )}

        {step === "failed" && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <XCircle className="h-10 w-10 text-destructive" />
            <p className="font-semibold text-foreground">Payment not completed</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <button onClick={() => setStep("otp")} className="btn-outline">
              Try again
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
