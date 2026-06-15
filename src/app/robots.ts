import type { MetadataRoute } from "next";
import { getAllPhoneNumbers } from "@/lib/spam";
import { planShards } from "@/lib/sitemap-shards";
import { SITE_URL } from "@/lib/config";

export const revalidate = 3600;

export default async function robots(): Promise<MetadataRoute.Robots> {
  // Derive the shard count the same way the sitemap does, so robots.txt always
  // lists exactly the shards that exist (/sitemap/<id>.xml).
  const numbers = await getAllPhoneNumbers();
  const shardCount = planShards(numbers.length).length;

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: Array.from(
      { length: shardCount },
      (_, i) => `${SITE_URL}/sitemap/${i}.xml`
    ),
    host: SITE_URL,
  };
}
