import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, FileText, Loader2, ShieldCheck } from "lucide-react";
import { AuthShell } from "./login";
import { authApi, ApiError } from "@/lib/api";
import { TermsDialog } from "@/components/TermsDialog";
import { PasswordInput } from "@/components/PasswordInput";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create account — FansBench" },
      {
        name: "description",
        content: "Join the verified fan reputation network. Dual-OTP required.",
      },
    ],
  }),
  component: Register,
});

function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    accept: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.firstName.trim().length < 2) return setError("Enter your first name.");
    if (form.lastName.trim().length < 2) return setError("Enter your last name.");
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError("Invalid email.");
    if (!/^\+?\d{9,15}$/.test(form.phone.replace(/\s/g, "")))
      return setError("Enter a valid phone number (e.g. +254...).");
    if (form.password.length < 8)
      return setError("Password must be at least 8 characters.");
    if (!form.accept)
      return setError("Please read and agree to the Terms and Conditions.");
    setLoading(true);
    try {
      const res = await authApi.register({
        first_name: form.firstName,
        last_name: form.lastName,
        email: form.email,
        phone: form.phone,
        password: form.password,
        password_confirmation: form.password,
      });
      sessionStorage.setItem("fb.otp.challenge", res.challenge.challenge_id);
      navigate({ to: "/verify-otp" });
    } catch (err) {
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
      title="Create a Fans Account"
      subtitle="Two-channel OTP keeps FansBench honest — one person, one vote."
      footer={
        <>
          Already a member?{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium">First name</label>
            <input
              className="fb-input"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              autoComplete="given-name"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Last name</label>
            <input
              className="fb-input"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              autoComplete="family-name"
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Email</label>
          <input
            type="email"
            className="fb-input"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            autoComplete="email"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Mobile number (for OTP + M-Pesa)
          </label>
          <input
            className="fb-input"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+254 7XX XXX XXX"
            autoComplete="tel"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Password</label>
          <PasswordInput
            value={form.password}
            onChange={(v) => setForm({ ...form, password: v })}
            autoComplete="new-password"
          />
        </div>
        <div className="flex items-center justify-between gap-3 rounded-md border border-border p-3 text-sm">
          <span className="flex items-center gap-2">
            {form.accept ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
            ) : (
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            {form.accept
              ? "You've agreed to the Terms and Conditions"
              : "You must read and agree to the Terms and Conditions"}
          </span>
          <button
            type="button"
            onClick={() => setTermsOpen(true)}
            className="shrink-0 text-sm font-semibold text-primary hover:underline"
          >
            {form.accept ? "Review" : "Read & agree"}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Paid votes are settled via M-Pesa STK-Push.
        </p>
        <TermsDialog
          open={termsOpen}
          onOpenChange={setTermsOpen}
          onAgree={() => setForm((f) => ({ ...f, accept: true }))}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button type="submit" disabled={loading} className="btn-accent w-full">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Creating account…
            </>
          ) : (
            "Create a Fans Account"
          )}
        </button>
        <div className="flex items-center gap-2 rounded-md bg-secondary p-3 text-xs text-primary">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          Next step: confirm the OTP we send to your email and phone.
        </div>
        <p className="text-center text-xs text-muted-foreground">
          You can revisit our{" "}
          <button
            type="button"
            onClick={() => setTermsOpen(true)}
            className="font-semibold text-primary hover:underline"
          >
            Terms of Use
          </button>{" "}
          any time.
        </p>
      </form>
    </AuthShell>
  );
}
