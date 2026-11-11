declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * The gtag.js snippet in __root.tsx only auto-fires one pageview, on the initial script
 * load. Every navigation after that is client-side (TanStack Router, no full reload), so
 * GA never hears about it unless we tell it explicitly on each route change.
 */
export function trackPageview(path: string): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;

  window.gtag("event", "page_view", {
    page_path: path,
    page_location: window.location.href,
  });
}
