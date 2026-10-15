// Worker entry: wraps the OpenNext handler with
//
//  1. an edge cache for number pages. They render on demand from D1
//     (force-dynamic), and this caches each 200 in the Cloudflare cache of the
//     colo that served it, so a crawler's repeat visit costs no render and no
//     D1 reads. The Cache API is free and only works on a custom domain —
//     on *.workers.dev every lookup misses, which is what we want when
//     measuring render cost.
//  2. a D1 meter per request: total rows read/written and query count, sent
//     back as x-d1-* headers and logged as one JSON line, so rows-per-render is
//     measured rather than estimated.

import { AsyncLocalStorage } from "node:async_hooks";
// @ts-expect-error `.open-next/worker.js` is generated at build time and untyped
import { default as handler } from "./.open-next/worker.js";

type D1Meter = { rowsRead: number; rowsWritten: number; queries: number };
// Same store src/lib/d1.ts writes to: the two are separate module graphs in
// one isolate, so the instance is shared through globalThis.
const g = globalThis as typeof globalThis & { __d1Meter?: AsyncLocalStorage<D1Meter> };
const d1Meter = (g.__d1Meter ??= new AsyncLocalStorage<D1Meter>());

const NUMBER_PAGE = /^\/lookup\/[2-9]\d{9}$/;
// How long a colo keeps a number page. Writes to a number (a community report,
// moderation) purge it explicitly; the import refreshes daily, so a day bounds
// staleness for everything else.
const EDGE_TTL_SECONDS = 86_400;

async function render(request: Request, env: unknown, ctx: ExecutionContext) {
  const meter: D1Meter = { rowsRead: 0, rowsWritten: 0, queries: 0 };
  const started = Date.now();
  const response: Response = await d1Meter.run(meter, () => handler.fetch(request, env, ctx));
  // Pages stream; their D1 reads can finish after the headers. Buffer the body
  // so the meter is complete, and so the cache gets a finished copy.
  const body = await response.arrayBuffer();
  const headers = new Headers(response.headers);
  headers.set("x-d1-rows-read", String(meter.rowsRead));
  headers.set("x-d1-rows-written", String(meter.rowsWritten));
  headers.set("x-d1-queries", String(meter.queries));
  console.log(
    JSON.stringify({
      m: "render",
      path: new URL(request.url).pathname,
      status: response.status,
      rows_read: meter.rowsRead,
      rows_written: meter.rowsWritten,
      queries: meter.queries,
      wall_ms: Date.now() - started,
      bytes: body.byteLength,
    })
  );
  return new Response(body, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request: Request, env: unknown, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (request.method !== "GET" || !NUMBER_PAGE.test(url.pathname)) {
      return render(request, env, ctx);
    }

    // Key on the path alone: query strings would let anyone mint unlimited
    // cache misses (each a render and D1 reads) for the same page.
    const key = new Request(`${url.origin}${url.pathname}`, { method: "GET" });
    const cache = (caches as unknown as { default: Cache }).default;
    const hit = await cache.match(key);
    if (hit) {
      const headers = new Headers(hit.headers);
      headers.set("x-edge-cache", "HIT");
      return new Response(hit.body, { status: hit.status, headers });
    }

    const response = await render(request, env, ctx);
    // Only 200s. A 500 must never be cached (invariant 6); 404s and redirects
    // are cheap to recompute and not worth a cache slot each.
    if (response.status === 200) {
      const cached = new Response(response.clone().body, response);
      cached.headers.set("Cache-Control", `public, s-maxage=${EDGE_TTL_SECONDS}`);
      cached.headers.delete("set-cookie");
      ctx.waitUntil(cache.put(key, cached));
    }
    const headers = new Headers(response.headers);
    headers.set("x-edge-cache", "MISS");
    return new Response(response.body, { status: response.status, headers });
  },
} satisfies ExportedHandler;

// @ts-expect-error `.open-next/worker.js` is generated at build time and untyped
export { DOQueueHandler } from "./.open-next/worker.js";
