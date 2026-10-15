import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// Number pages are cached at the edge by worker.ts (Cache API, keyed by URL,
// per colo, a day). A write that changes a number — a community report,
// moderation, an import — must drop that page everywhere:
//
//  * caches.default.delete() clears the colo handling this request;
//  * the zone purge API clears every other colo. It needs the
//    CACHE_PURGE_API_TOKEN secret (Zone > Cache Purge) and CACHE_PURGE_ZONE_ID.
//    Without them pages still refresh within EDGE_TTL in worker.ts, so a
//    missing token degrades freshness, never correctness — logged, not thrown.

const HOSTS = ["https://www.canadial.com", "https://next.canadial.com"];
const PURGE_BATCH = 30; // URLs per purge call allowed on every plan

// `origin` is the host the triggering request came in on, so its colo copy is
// cleared even on a hostname not listed above (local wrangler dev).
export async function purgeNumberPages(phones: string[], origin?: string): Promise<void> {
  const hosts = origin && !HOSTS.includes(origin) ? [...HOSTS, origin] : HOSTS;
  const urls = phones.flatMap((p) => hosts.map((h) => `${h}/lookup/${p}`));
  if (urls.length === 0) return;

  const cache = (globalThis as unknown as { caches?: { default?: Cache } }).caches?.default;
  if (cache) await Promise.all(urls.map((u) => cache.delete(new Request(u)).catch(() => false)));

  const { env } = await getCloudflareContext({ async: true });
  const { CACHE_PURGE_API_TOKEN: token, CACHE_PURGE_ZONE_ID: zone } = env as {
    CACHE_PURGE_API_TOKEN?: string;
    CACHE_PURGE_ZONE_ID?: string;
  };
  if (!token || !zone) {
    console.warn(`edge purge skipped for ${phones.length} number(s): purge token not configured`);
    return;
  }
  const zoneUrls = urls.filter((u) => /^https:\/\/([a-z0-9-]+\.)?canadial\.com\//.test(u));
  for (let i = 0; i < zoneUrls.length; i += PURGE_BATCH) {
    const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zone}/purge_cache`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ files: zoneUrls.slice(i, i + PURGE_BATCH) }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.error(`edge purge failed: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  }
}
