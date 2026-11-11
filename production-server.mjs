import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { serve } from "srvx/node";
import { serveStatic } from "srvx/static";
import ssrHandler from "./dist/server/server.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// dist/server/server.js only exports a fetch handler (no built-in static file
// serving or Node listener) — this wires the two together and actually binds a port.
const staticMiddleware = serveStatic({ dir: join(__dirname, "dist/client") });

const port = Number(process.env.PORT) || 3010;
const hostname = process.env.HOST || "127.0.0.1";

serve({
  fetch: (request) => staticMiddleware(request, () => ssrHandler.fetch(request)),
  port,
  hostname,
});

console.log(`fansbench frontend listening on http://${hostname}:${port}`);
