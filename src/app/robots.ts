import type { MetadataRoute } from "next";
import { getAllPhoneNumbers } from "@/lib/spam";
import { planShards } from "@/lib/sitemap-shards";
import { SITE_URL } from "@/lib/config";

export const revalidate = 86400;

export default async function robots(): Promise<MetadataRoute.Robots> {
  // Derive the shard count the same way the sitemap does, so robots.txt always
  // lists exactly the shards that exist (/sitemap/<id>.xml).
  const numbers = await getAllPhoneNumbers();
  const shardCount = planShards(numbers.length).length;

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The JSON API (e.g. /api/v1/lookup) returns data, not indexable pages.
      disallow: "/api/",
    },
    sitemap: Array.from(
      { length: shardCount },
      (_, i) => `${SITE_URL}/sitemap/${i}.xml`
    ),
    host: SITE_URL,
  };
}
