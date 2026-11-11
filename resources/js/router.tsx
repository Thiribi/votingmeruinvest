import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

declare global {
  interface Window {
    __fansbenchPreloadErrorHandlerInstalled?: boolean;
  }
}

// A browser tab left open (or cached) across a deploy is still running code that imports
// lazy chunks by their old content hash — hashes that no longer exist once a new deploy
// ships fresh filenames and prunes old releases. Vite fires `vite:preloadError` on the
// window whenever exactly that happens; the only correct recovery is a full reload, which
// re-fetches index.html and picks up the current build's actual chunk names.
function installPreloadErrorReload() {
  if (typeof window === "undefined" || window.__fansbenchPreloadErrorHandlerInstalled) return;
  window.__fansbenchPreloadErrorHandlerInstalled = true;

  window.addEventListener("vite:preloadError", () => {
    window.location.reload();
  });
}

export const getRouter = () => {
  installPreloadErrorReload();

  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
