import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { PasswordInput } from "@/components/PasswordInput";
import { authApi, ApiError } from "@/lib/api";


/** Where to send the user after they finish signing in — set by "Sign in to continue" links. */
export const REDIRECT_STORAGE_KEY = "fb.auth.redirect";

type LoginSearch = { redirect?: string };

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — FansBench" },
      { name: "description", content: "Sign in to your verified FansBench account." },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetNote, setResetNote] = useState<string | null>(null);

  async function onForgotPassword() {
    setError(null);
    setResetNote(null);
    if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      return setError("Enter your email above first, then tap Forgot password.");
    }
    try {
      await authApi.forgotPassword(form.email);
    } catch {
      // Intentionally ignored — we always show the same confirmation to avoid leaking
      // which emails are registered.
    }
    setResetNote("If that email is registered, a password reset link is on its way.");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(form.email))
      return setError("Enter a valid email address.");
    if (form.password.length < 8)
      return setError("Password must be at least 8 characters.");
    setLoading(true);
    // Carry the post-login destination across the OTP step (verify-otp reads it back).
    if (redirect && redirect.startsWith("/") && !redirect.startsWith("//")) {
      sessionStorage.setItem(REDIRECT_STORAGE_KEY, redirect);
    } else {
      sessionStorage.removeItem(REDIRECT_STORAGE_KEY);
    }
    try {
      const res = await authApi.login({ email: form.email, password: form.password });
      sessionStorage.setItem("fb.otp.challenge", res.challenge.challenge_id);
      navigate({ to: "/verify-otp" });
    } catch (err) {
      // Fallback: proceed to OTP screen if backend is not wired yet (dev-only).
      if (err instanceof ApiError && err.status !== 0) {
        setError(err.message);
      } else {
        navigate({ to: "/verify-otp" });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to keep your verified reputation active."
      footer={
        <>
          New to FansBench?{" "}
          <Link to="/register" className="font-semibold text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Email</label>
          <input
            type="email"
            className="fb-input"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            autoComplete="email"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Password</label>
          <PasswordInput
            value={form.password}
            onChange={(v) => setForm({ ...form, password: v })}
            autoComplete="current-password"
          />
          <div className="mt-1.5 text-right">
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Forgot password?
            </button>
          </div>
        </div>
        {resetNote && <p className="text-sm text-success">{resetNote}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </button>
      </form>
    </AuthShell>
  );
}

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-4">
          <Link to="/">
            <Logo />
          </Link>
        </div>
      </header>
      <main className="mx-auto flex max-w-md flex-col px-4 py-10">
        <div className="fb-card p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
          <div className="mt-6">{children}</div>
        </div>
        {footer && (
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {footer}
          </p>
        )}
      </main>
    </div>
  );
}
