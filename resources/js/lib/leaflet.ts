/* eslint-disable @typescript-eslint/no-explicit-any */

// Loads Leaflet (map library) from CDN on the client only, once. Avoids bundling/SSR issues
// with TanStack Start — Leaflet needs `window`. Uses OpenStreetMap tiles, so no API key.
const LEAFLET_VERSION = "1.9.4";
let leafletPromise: Promise<any> | null = null;

export function loadLeaflet(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("Leaflet needs a browser"));
  if ((window as any).L) return Promise.resolve((window as any).L);
  if (leafletPromise) return leafletPromise;

  leafletPromise = new Promise((resolve, reject) => {
    if (!document.querySelector("link[data-leaflet]")) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css`;
      link.setAttribute("data-leaflet", "true");
      document.head.appendChild(link);
    }

    const script = document.createElement("script");
    script.src = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js`;
    script.async = true;
    script.onload = () => resolve((window as any).L);
    script.onerror = () => reject(new Error("Failed to load Leaflet"));
    document.body.appendChild(script);
  });

  return leafletPromise;
}
