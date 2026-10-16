import { getShards, sitemapIndex } from "@/lib/sitemap-data";
import { latestFtcDay } from "@/lib/hub-data";

// Sitemap index: the core sitemap plus every number and NPA-NXX block shard.
// Rebuilt daily; shard boundaries come from the daily refresh.
export const revalidate = 86400;

export async function GET() {
  const [shards, day] = await Promise.all([getShards(), latestFtcDay()]);
  return sitemapIndex([
    { loc: "/sitemaps/core.xml", lastmod: day },
    ...shards.map((s) => ({ loc: `/sitemaps/${s.kind}/${s.shard}.xml`, lastmod: s.lastmod })),
  ]);
}
