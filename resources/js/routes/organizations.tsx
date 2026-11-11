import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, CheckCircle2 } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { organizationsApi, type Organization } from "@/lib/api";

export const Route = createFileRoute("/organizations")({
  head: () => ({
    meta: [
      { title: "Organizations — FansBench" },
      {
        name: "description",
        content: "Verified organizations running private FansBench campaigns.",
      },
    ],
  }),
  component: OrgsPage,
});

function OrgsPage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    organizationsApi
      .list()
      .then((r) => setOrgs(r.data))
      .catch(() => setOrgs([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout>
      <section>
        <h1 className="text-2xl font-bold text-foreground">Organizations</h1>
        <p className="text-sm text-muted-foreground">
          Verified employers running internal, token-gated polls on FansBench.
        </p>
        {!loading && orgs.length === 0 && (
          <p className="mt-6 py-8 text-center text-sm text-muted-foreground">
            No verified organizations yet — check back soon.
          </p>
        )}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orgs.map((o) => (
            <article key={String(o.id)} className="fb-card fb-card-hover p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-md bg-secondary text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{o.name}</p>
                  <p className="text-xs text-muted-foreground">{o.industry}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {o.active_campaigns ?? 0} active
                </span>
                {o.verified && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </AppLayout>
  );
}
