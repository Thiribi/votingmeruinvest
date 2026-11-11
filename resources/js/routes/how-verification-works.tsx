import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";

export const Route = createFileRoute("/how-verification-works")({
  head: () => ({
    meta: [
      { title: "How Verification Works — FansBench" },
      {
        name: "description",
        content:
          "How FansBench verifies every fan and every vote — Dual-OTP identity, M-Pesa payment binding, and fraud review.",
      },
    ],
  }),
  component: HowVerificationWorks,
});

const rules = [
  "Every fan registers with a valid Email and Messaging App number, and confirms both via Dual-OTP.",
  "Paid votes are settled through M-Pesa STK-Push — the transaction reference is bound to the vote record.",
  "Duplicate transaction references, suspicious velocity, or mismatched OTP channels are auto-flagged for the Fraud Review queue.",
  "Category rules, closing dates and result methodology are published before voting opens and cannot be altered mid-campaign.",
];

function HowVerificationWorks() {
  return (
    <AppLayout>
      <section className="fb-card overflow-hidden">
        <div className="bg-linear-to-br from-primary via-[#0B4A8F] to-accent px-6 py-10 text-white">
          <div className="inline-flex rounded-full bg-white/15 p-2">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="mt-3 text-3xl font-bold text-white">How Verification Works</h1>
          <p className="mt-3 max-w-2xl text-white/85">
            FansBench is built to eliminate bots and duplicate voting. Here's exactly how we
            keep every ranking honest — from identity to payment to fraud review.
          </p>
        </div>
      </section>

      <section className="fb-card mt-4 p-6">
        <h2 className="text-xl font-semibold text-foreground">Our verification rules</h2>
        <ol className="mt-4 space-y-3 text-sm text-foreground/90">
          {rules.map((rule, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {i + 1}
              </span>
              <p>{rule}</p>
            </li>
          ))}
        </ol>
      </section>
    </AppLayout>
  );
}
