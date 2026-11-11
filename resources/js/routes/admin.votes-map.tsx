import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import {
  adminApi,
  categoriesApi,
  organizationsApi,
  type Category,
  type Organization,
  type VotePoint,
} from "@/lib/api";
import { loadLeaflet } from "@/lib/leaflet";

export const Route = createFileRoute("/admin/votes-map")({
  component: VotesMap,
});

type Mode = "category" | "organization";

// Roughly centres the map on Kenya until points load and we fit to them.
const DEFAULT_CENTER: [number, number] = [-0.0236, 37.9062];
const DEFAULT_ZOOM = 6;

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}

function VotesMap() {
  const [mode, setMode] = useState<Mode>("category");
  const [categories, setCategories] = useState<Category[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [points, setPoints] = useState<VotePoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const mapEl = useRef<HTMLDivElement>(null);
  const mapObj = useRef<any>(null);
  const layer = useRef<any>(null);

  useEffect(() => {
    categoriesApi.list().then((r) => setCategories(r.data)).catch(() => setCategories([]));
    organizationsApi.list().then((r) => setOrganizations(r.data)).catch(() => setOrganizations([]));
  }, []);

  // Init the Leaflet map once (client-only).
  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !mapEl.current || mapObj.current) return;
        mapObj.current = L.map(mapEl.current).setView(DEFAULT_CENTER, DEFAULT_ZOOM);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
          maxZoom: 19,
        }).addTo(mapObj.current);
        layer.current = L.layerGroup().addTo(mapObj.current);
        setMapReady(true);
      })
      .catch(() => setMapError("Couldn't load the map. Check your connection and retry."));
    return () => {
      cancelled = true;
      if (mapObj.current) {
        mapObj.current.remove();
        mapObj.current = null;
      }
    };
  }, []);

  // Fetch points whenever the filter changes.
  useEffect(() => {
    setLoading(true);
    const query =
      mode === "category"
        ? categoryId
          ? { category_id: categoryId }
          : {}
        : organizationId
          ? { organization_id: organizationId }
          : {};
    adminApi
      .votesMap(query)
      .then((r) => setPoints(r.data))
      .catch(() => setPoints([]))
      .finally(() => setLoading(false));
  }, [mode, categoryId, organizationId]);

  // Render markers when points or map readiness change.
  useEffect(() => {
    const L = (window as any).L;
    if (!mapReady || !L || !layer.current) return;
    layer.current.clearLayers();
    // A cheering fan on the map, not a plain dot — 📣 marks every geo-tagged vote.
    const fanIcon = L.divIcon({
      html: '<span style="font-size:22px;line-height:1;">📣</span>',
      className: "",
      iconSize: [24, 24],
      iconAnchor: [12, 20],
      popupAnchor: [0, -18],
    });
    points.forEach((p) => {
      L.marker([p.latitude, p.longitude], { icon: fanIcon })
        .bindPopup(
          `<strong>${escapeHtml(p.nominee ?? "Vote")}</strong><br>` +
            `${escapeHtml(p.campaign ?? "")}<br>` +
            `<span style="color:#64748b">${escapeHtml(p.county ?? "")}</span>`,
        )
        .addTo(layer.current);
    });
    if (points.length > 0) {
      const bounds = L.latLngBounds(points.map((p) => [p.latitude, p.longitude]));
      mapObj.current.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
    }
  }, [points, mapReady]);

  return (
    <AdminLayout title="Vote Density Map">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Filter by</label>
            <div className="inline-flex overflow-hidden rounded-lg border border-border">
              {(["category", "organization"] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`px-4 py-2 text-sm font-medium capitalize ${
                    mode === m ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-surface-muted"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {mode === "category" ? (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Category</label>
              <select
                className="fb-input min-w-[220px]"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={String(c.id)} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Organization</label>
              <select
                className="fb-input min-w-[220px]"
                value={organizationId}
                onChange={(e) => setOrganizationId(e.target.value)}
              >
                <option value="">All organizations</option>
                {organizations.map((o) => (
                  <option key={String(o.id)} value={String(o.id)}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Loading votes…
            </>
          ) : (
            <>
              <MapPin className="h-4 w-4 text-accent" /> {points.length.toLocaleString()} geo-tagged vote
              {points.length === 1 ? "" : "s"}
            </>
          )}
        </div>
      </div>

      <div className="fb-card overflow-hidden p-0">
        {mapError ? (
          <div className="flex h-[600px] items-center justify-center text-sm text-muted-foreground">
            {mapError}
          </div>
        ) : (
          <div ref={mapEl} className="h-[600px] w-full" />
        )}
      </div>
      {!loading && points.length === 0 && !mapError && (
        <p className="mt-3 text-center text-sm text-muted-foreground">
          No geo-tagged votes for this selection yet.
        </p>
      )}
    </AdminLayout>
  );
}
