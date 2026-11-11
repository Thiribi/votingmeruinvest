import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { AuthShell } from "./login";
import { PasswordInput } from "@/components/PasswordInput";
import { authApi, ApiError } from "@/lib/api";

type Search = { email?: string; token?: string };

export const Route = createFileRoute("/reset-password")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    email: typeof s.email === "string" ? s.email : undefined,
    token: typeof s.token === "string" ? s.token : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Reset your password — FansBench" },
      { name: "description", content: "Set a new password for your FansBench account." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const { email, token } = Route.useSearch();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const linkValid = !!email && !!token;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords don't match.");
    setLoading(true);
    try {
      await authApi.resetPassword({
        email: email!,
        token: token!,
        password,
        password_confirmation: confirm,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't reset your password. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!linkValid) {
    return (
      <AuthShell title="Reset your password" subtitle="This link looks incomplete.">
        <p className="text-sm text-muted-foreground">
          Open the reset link from your email again, or request a new one from the{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            sign-in page
          </Link>
          .
        </p>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell title="Password updated" subtitle="You're all set.">
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <CheckCircle2 className="h-10 w-10 text-success" />
          <p className="text-sm text-muted-foreground">
            Your password has been reset. Sign in with your new password to continue.
          </p>
          <Link to="/login" className="btn-accent w-full">
            Sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle={`Choose a new password for ${email}.`}
      footer={
        <>
          Remembered it after all?{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div>
          <label className="mb-1.5 block text-sm font-medium">New password</label>
          <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Confirm new password</label>
          <PasswordInput value={confirm} onChange={setConfirm} autoComplete="new-password" />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Resetting…
            </>
          ) : (
            "Reset password"
          )}
        </button>
      </form>
    </AuthShell>
  );
}
