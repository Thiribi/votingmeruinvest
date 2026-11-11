import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, Eye, Fingerprint, Scale, ArrowRight } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About FansBench — Transparent, verified fan voting" },
      {
        name: "description",
        content:
          "FansBench is built by TechDeciphers to eliminate bots and duplicate voting through One-user One-vote per category rule.",
      },
      { property: "og:title", content: "About FansBench" },
      {
        property: "og:description",
        content: "Transparent Voting. Verified Identity. Public Results.",
      },
    ],
  }),
  component: About,
});

const pillars = [
  {
    icon: ShieldCheck,
    title: "Verified identity",
    body: "Every account passes Dual-OTP verification via Email and Messaging App before its first vote counts.",
  },
  {
    icon: Fingerprint,
    title: "One person, one vote",
    body: "M-Pesa STK-Push binds each vote to a real, unique payer — bots and duplicate accounts cannot participate.",
  },
  {
    icon: Eye,
    title: "Public transparency",
    body: "All aggregate tallies, category rules and verification statuses are public and auditable in real time.",
  },
  {
    icon: Scale,
    title: "Fair moderation",
    body: "A dedicated Fraud Review team monitors suspicious patterns and applies clearly published sanctions.",
  },
];

function About() {
  return (
    <AppLayout>
      <section className="fb-card overflow-hidden">
        <div className="relative bg-linear-to-br from-primary via-[#0B4A8F] to-accent px-6 py-12 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_55%)]" />
          <div className="relative">
            <h1 className="text-3xl font-bold text-white sm:text-4xl">About FansBench</h1>
            <p className="mt-3 max-w-2xl text-white/90">
              FansBench is a verified fan-engagement and reputation platform
              built by <strong className="text-white">TechDeciphers</strong>. Our
              mission is simple: give fans, brands and institutions a place where
              influence is measured honestly.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-4 grid gap-4 sm:grid-cols-2">
        {pillars.map((p) => (
          <div key={p.title} className="fb-card fb-card-hover p-5">
            <div className="inline-flex rounded-full bg-secondary p-2 text-primary">
              <p.icon className="h-5 w-5" />
            </div>
            <h2 className="mt-3 text-base font-semibold text-foreground">
              {p.title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{p.body}</p>
          </div>
        ))}
      </section>

      <section className="fb-card mt-4 flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Curious how we keep it honest?
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            See the full identity, payment and fraud-review rules behind every vote.
          </p>
        </div>
        <Link to="/how-verification-works" className="btn-accent shrink-0">
          How verification works
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </AppLayout>
  );
}
