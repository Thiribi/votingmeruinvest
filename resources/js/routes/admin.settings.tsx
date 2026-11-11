import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { adminApi, ApiError } from "@/lib/api";

export const Route = createFileRoute("/admin/settings")({
  component: SettingsPage,
});

type Settings = {
  platform_name: string;
  support_email: string;
  require_dual_otp: boolean;
  mpesa_enabled: boolean;
  mpesa_shortcode?: string;
  fraud_auto_review: boolean;
  max_votes_per_ip: number;
};

const DEFAULTS: Settings = {
  platform_name: "FansBench",
  support_email: "info@techdeciphers.co.ke",
  require_dual_otp: true,
  mpesa_enabled: true,
  mpesa_shortcode: "1349917",
  fraud_auto_review: true,
  max_votes_per_ip: 5,
};

function SettingsPage() {
  const [form, setForm] = useState<Settings>(DEFAULTS);
  const [status, setStatus] = useState<"idle" | "loading" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStatus("loading");
    adminApi.settings
      .get()
      .then((s) => {
        setForm({ ...DEFAULTS, ...s });
        setStatus("idle");
      })
      .catch(() => setStatus("idle")); // fallback to defaults if API not reachable
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setError(null);
    try {
      await adminApi.settings.update(form as unknown as Record<string, unknown>);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 1500);
    } catch (err) {
      setStatus("error");
      setError(err instanceof ApiError ? err.message : "Failed to save settings.");
    }
  }

  return (
    <AdminLayout title="Platform Settings">
      <form onSubmit={save} className="grid gap-6 lg:grid-cols-2">
        <section className="fb-card p-6">
          <h2 className="text-lg font-semibold">General</h2>
          <div className="mt-4 space-y-4">
            <Field label="Platform name">
              <input
                className="fb-input"
                value={form.platform_name}
                onChange={(e) => setForm({ ...form, platform_name: e.target.value })}
              />
            </Field>
            <Field label="Support email">
              <input
                type="email"
                className="fb-input"
                value={form.support_email}
                onChange={(e) => setForm({ ...form, support_email: e.target.value })}
              />
            </Field>
            <Field label="Max votes per IP (per 24h)">
              <input
                type="number"
                min={1}
                className="fb-input"
                value={form.max_votes_per_ip}
                onChange={(e) =>
                  setForm({ ...form, max_votes_per_ip: Number(e.target.value) || 1 })
                }
              />
            </Field>
          </div>
        </section>

        <section className="fb-card p-6">
          <h2 className="text-lg font-semibold">Verification & Payments</h2>
          <div className="mt-4 space-y-4">
            <Toggle
              label="Require Dual-OTP (email + messaging app)"
              value={form.require_dual_otp}
              onChange={(v) => setForm({ ...form, require_dual_otp: v })}
            />
            <Toggle
              label="Enable M-Pesa STK-Push voting"
              value={form.mpesa_enabled}
              onChange={(v) => setForm({ ...form, mpesa_enabled: v })}
            />
            <Field label="M-Pesa short code">
              <input
                className="fb-input"
                value={form.mpesa_shortcode ?? ""}
                onChange={(e) => setForm({ ...form, mpesa_shortcode: e.target.value })}
                disabled={!form.mpesa_enabled}
              />
            </Field>
            <Toggle
              label="Auto-review high-risk votes"
              value={form.fraud_auto_review}
              onChange={(v) => setForm({ ...form, fraud_auto_review: v })}
            />
          </div>
        </section>

        <div className="lg:col-span-2 flex items-center gap-3">
          <button
            type="submit"
            disabled={status === "saving" || status === "loading"}
            className="btn-primary"
          >
            {status === "saving" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving…
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> Save changes
              </>
            )}
          </button>
          {status === "saved" && (
            <span className="text-sm text-success">Settings saved.</span>
          )}
          {error && <span className="text-sm text-destructive">{error}</span>}
        </div>
      </form>
    </AdminLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-md border border-border bg-surface-muted px-3 py-2.5">
      <span className="text-sm text-foreground">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          value ? "bg-primary" : "bg-border"
        }`}
        aria-pressed={value}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            value ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </label>
  );
}
