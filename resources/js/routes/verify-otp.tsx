import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { AuthShell, REDIRECT_STORAGE_KEY } from "./login";
import { authApi, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { captureAndSaveLocation } from "@/lib/geo";
import { useWebOtp } from "@/lib/useWebOtp";

const OTP_LENGTH = 4;

export const Route = createFileRoute("/verify-otp")({
  head: () => ({
    meta: [
      { title: "Verify your account — FansBench" },
      { name: "description", content: "Enter your OTP to activate voting." },
    ],
  }),
  component: VerifyOtp,
});

function VerifyOtp() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [otp, setOtp] = useState(Array<string>(OTP_LENGTH).fill(""));
  const [seconds, setSeconds] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  function update(i: number, v: string) {
    const digit = v.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[i] = digit;
    setOtp(next);
    if (digit && i < OTP_LENGTH - 1) refs.current[i + 1]?.focus();
  }

  function key(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otp[i] && i > 0) refs.current[i - 1]?.focus();
  }

  function fillFrom(i: number, digits: string) {
    const next = [...otp];
    let last = i;
    for (const digit of digits) {
      if (last > OTP_LENGTH - 1) break;
      next[last] = digit;
      last++;
    }
    setOtp(next);
    refs.current[Math.min(last, OTP_LENGTH - 1)]?.focus();
  }

  function paste(i: number, e: React.ClipboardEvent<HTMLInputElement>) {
    const digits = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!digits) return;
    e.preventDefault();
    fillFrom(i, digits);
  }

  // Auto-fills straight from the SMS on supporting browsers — the user never has to leave
  // the tab to open Messages at all. Falls back to nothing (manual entry/paste still work)
  // wherever WebOTP isn't supported.
  useWebOtp(
    useCallback((code: string) => {
      const digits = code.replace(/\D/g, "").slice(0, OTP_LENGTH);
      if (digits.length !== OTP_LENGTH) return;
      setOtp(digits.split(""));
      refs.current[OTP_LENGTH - 1]?.focus();
    }, []),
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (otp.join("").length !== OTP_LENGTH) return setError(`Enter the ${OTP_LENGTH}-digit OTP.`);
    setLoading(true);
    try {
      const challenge_id = sessionStorage.getItem("fb.otp.challenge") ?? "";
      const res = await authApi.verifyOtp({ challenge_id, otp: otp.join("") });
      sessionStorage.removeItem("fb.otp.challenge");
      await refresh();
      // Capture location once, now that we're authenticated, to feed the vote-density map.
      // Best-effort and non-blocking — a denied prompt must not hold up sign-in.
      void captureAndSaveLocation();

      // If the user came from a "Sign in to continue" link, send them back where they were.
      const stored = sessionStorage.getItem(REDIRECT_STORAGE_KEY);
      sessionStorage.removeItem(REDIRECT_STORAGE_KEY);
      if (stored && stored.startsWith("/") && !stored.startsWith("//")) {
        window.location.assign(stored);
        return;
      }

      const isStaff = res.user.role === "admin" || res.user.role === "moderator" || res.user.role === "organizer";
      navigate({ to: isStaff ? "/admin" : "/" });
    } catch (err) {
      if (err instanceof ApiError && err.status !== 0) {
        setError(err.message);
      } else {
        navigate({ to: "/" });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Verify your account"
      subtitle={`Enter the ${OTP_LENGTH}-digit OTP we sent to your email and phone.`}
    >
      <form onSubmit={onSubmit} className="space-y-6" noValidate>
        <div>
          <label className="mb-2 block text-sm font-semibold text-foreground">Enter OTP</label>
          <div className="flex justify-center gap-3">
            {otp.map((v, i) => (
              <input
                key={i}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                inputMode="numeric"
                autoComplete={i === 0 ? "one-time-code" : "off"}
                maxLength={1}
                value={v}
                onChange={(e) => update(i, e.target.value)}
                onKeyDown={(e) => key(i, e)}
                onPaste={(e) => paste(i, e)}
                className="fb-input h-14 w-14 text-center text-xl font-semibold"
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {seconds > 0 ? (
              <>Code expires in {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}</>
            ) : (
              "Code expired."
            )}
          </span>
          <button
            type="button"
            disabled={seconds > 0}
            onClick={() => setSeconds(60)}
            className="font-semibold text-primary disabled:text-muted-foreground"
          >
            Resend code
          </button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Verifying…
            </>
          ) : (
            "Verify & activate"
          )}
        </button>

        <div className="flex items-center gap-2 rounded-md bg-secondary p-3 text-xs text-primary">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          FansBench never asks for OTP codes over the phone.
        </div>
      </form>
    </AuthShell>
  );
}
