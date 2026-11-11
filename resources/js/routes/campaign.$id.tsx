import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, ShieldCheck, Building2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { votesApi, campaignsApi, ApiError, type Campaign as CampaignType } from "@/lib/api";

type Search = { token?: string };

export const Route = createFileRoute("/campaign/$id")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    token: typeof s.token === "string" ? s.token : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Internal campaign — FansBench" },
      { name: "description", content: "Secure internal organization voting." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Campaign,
});

type GeoStatus = "idle" | "requesting" | "granted" | "denied" | "unsupported";

function Campaign() {
  const { id } = Route.useParams();
  const search = useSearch({ from: "/campaign/$id" }) as Search;
  const [campaign, setCampaign] = useState<CampaignType | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "invalid">(
    search.token ? "idle" : "invalid",
  );
  const options = campaign?.options ?? [];

  useEffect(() => {
    if (!search.token) return;
    campaignsApi
      .get(id, search.token)
      .then(setCampaign)
      .catch(() => setStatus("invalid"));
  }, [id, search.token]);

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<GeoStatus>("idle");

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

  async function cast() {
    if (!selected) return;
    setStatus("loading");
    try {
      await votesApi.cast({
        campaign_id: id,
        option_id: selected,
        token: search.token,
        latitude: coords?.lat,
        longitude: coords?.lng,
      });
      setStatus("done");
    } catch (err) {
      if (err instanceof ApiError && err.status !== 0) {
        setStatus("invalid");
      } else {
        setStatus("done");
      }
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Logo />
          <span className="chip">
            <Building2 className="h-3 w-3" /> Internal campaign
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="fb-card p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Campaign #{id}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">
            {campaign?.title ?? "Loading campaign…"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cast one verified vote for your preferred venue. Your response is
            tied to your invite token and cannot be changed after submission.
          </p>

          {status === "invalid" ? (
            <div className="mt-6 rounded-md border border-destructive/30 bg-[color-mix(in_oklab,var(--destructive)_8%,transparent)] p-4 text-sm text-destructive">
              This link is missing a valid access token. Please use the exact
              invite URL shared by your organization.
            </div>
          ) : status === "done" ? (
            <div className="mt-6 flex items-start gap-3 rounded-md border border-success/30 bg-[color-mix(in_oklab,var(--success)_10%,transparent)] p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-success" />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Vote recorded
                </p>
                <p className="text-sm text-muted-foreground">
                  Thanks — your verified vote for{" "}
                  <strong>{options.find((o) => String(o.id) === selected)?.label}</strong>{" "}
                  has been logged. Results will be shared by your organizer.
                </p>
              </div>
            </div>
          ) : (
            <>
              {options.length === 0 ? (
                <p className="mt-6 text-sm text-muted-foreground">
                  {campaign ? "This campaign has no voting options yet." : "Loading options…"}
                </p>
              ) : (
                <div className="mt-6 grid gap-3">
                  {options.map((opt) => {
                    const optId = String(opt.id);
                    const active = selected === optId;
                    return (
                      <button
                        key={optId}
                        type="button"
                        onClick={() => setSelected(optId)}
                        className={`fb-card fb-card-hover text-left p-4 transition-colors ${
                          active
                            ? "ring-2 ring-primary border-primary"
                            : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-base font-semibold text-foreground">
                              {opt.label}
                            </p>
                            {opt.nominee?.tag && (
                              <p className="text-xs text-muted-foreground">
                                {opt.nominee.tag}
                              </p>
                            )}
                            {opt.description && (
                              <p className="mt-2 text-sm text-foreground/90">
                                {opt.description}
                              </p>
                            )}
                          </div>
                          <span
                            className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                              active
                                ? "border-primary bg-primary"
                                : "border-border"
                            }`}
                          >
                            {active && (
                              <span className="h-2 w-2 rounded-full bg-white" />
                            )}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {selected && (
                <p className="mt-6 text-xs text-muted-foreground">
                  {geoStatus === "granted" && "Device location captured for verification."}
                  {geoStatus === "requesting" && "Requesting device location…"}
                  {geoStatus === "denied" && "Precise location declined — your vote will be tagged with an approximate location from your connection."}
                  {geoStatus === "unsupported" && "Location isn't supported on this device."}
                </p>
              )}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Token-authenticated · one vote per invite
                </div>
                <button
                  disabled={!selected || status === "loading"}
                  onClick={cast}
                  className="btn-accent w-full sm:w-auto"
                >
                  {status === "loading" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
                    </>
                  ) : (
                    "Cast verified vote"
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
