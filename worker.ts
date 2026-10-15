// Worker entry: wraps the OpenNext handler with
//
//  1. an edge cache for number pages. They render on demand from D1
//     (force-dynamic), and this caches each 200 in the Cloudflare cache of the
//     colo that served it, so a crawler's repeat visit costs no render and no
//     D1 reads. The Cache API is free. It also works on *.workers.dev
//     (measured: repeat requests were HITs at ~1.3 ms CPU), so measuring
//     render cost needs URLs that have never been requested.
//  2. a D1 meter per request: total rows read/written and query count, sent
//     back as x-d1-* headers and logged as one JSON line, so rows-per-render is
//     measured rather than estimated (health.yml asserts the bound).
//  3. host handling: the apex 308s to www, and any other hostname (staging)
//     is served with noindex and a disallow-all robots.txt.

import { AsyncLocalStorage } from "node:async_hooks";
// `.open-next/worker.js` exists only after a build, so this must compile both
// with and without it: @ts-expect-error would fail once it exists.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
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

const PRODUCTION_HOST = "www.canadial.com";
const APEX_HOST = "canadial.com";
// What browsers get for a number page: always revalidate, as Vercel sent.
// The edge copy is governed by EDGE_TTL_SECONDS, not by this.
const NUMBER_PAGE_BROWSER_CACHE = "public, max-age=0, must-revalidate";

export default {
  async fetch(request: Request, env: unknown, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // The apex redirects to www, permanently, as it did on Vercel.
    if (url.hostname === APEX_HOST) {
      return Response.redirect(`https://${PRODUCTION_HOST}${url.pathname}${url.search}`, 308);
    }

    // Any other hostname (next.canadial.com while staging) serves the same
    // site but must never be indexed as a duplicate of it.
    if (url.hostname !== PRODUCTION_HOST) {
      if (url.pathname === "/robots.txt") {
        return new Response("User-agent: *\nDisallow: /\n", {
          headers: { "content-type": "text/plain", "x-robots-tag": "noindex, nofollow" },
        });
      }
      const res = await serve(request, url, env, ctx);
      const headers = new Headers(res.headers);
      headers.set("x-robots-tag", "noindex, nofollow");
      return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
    }

    return serve(request, url, env, ctx);
  },
} satisfies ExportedHandler;

async function serve(request: Request, url: URL, env: unknown, ctx: ExecutionContext) {
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
    headers.set("cache-control", NUMBER_PAGE_BROWSER_CACHE);
    headers.set("x-edge-cache", "HIT");
    return new Response(hit.body, { status: hit.status, headers });
  }

  const response = await render(request, env, ctx);
  // Only 200s. A 500 must never be cached (invariant 6); 404s and redirects
  // are cheap to recompute and not worth a cache slot each.
  if (response.status === 200) {
    const cached = new Response(response.clone().body, response);
    cached.headers.set("cache-control", `public, s-maxage=${EDGE_TTL_SECONDS}`);
    cached.headers.delete("set-cookie");
    ctx.waitUntil(cache.put(key, cached));
  }
  const headers = new Headers(response.headers);
  if (response.status === 200) headers.set("cache-control", NUMBER_PAGE_BROWSER_CACHE);
  headers.set("x-edge-cache", "MISS");
  return new Response(response.body, { status: response.status, headers });
}


// `.open-next/worker.js` exists only after a build, so this must compile both
// with and without it: @ts-expect-error would fail once it exists.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export { DOQueueHandler } from "./.open-next/worker.js";
