import type { MetadataRoute } from "next";
import { LOCALES } from "@/lib/i18n";
import { SITE_URL } from "@/lib/config";

// One sitemap shard for core pages + English, one per non-English locale.
const SHARD_COUNT = 1 + LOCALES.filter((l) => l.code !== "en").length;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    // generateSitemaps emits each shard at /sitemap/<id>.xml — list them all.
    sitemap: Array.from(
      { length: SHARD_COUNT },
      (_, i) => `${SITE_URL}/sitemap/${i}.xml`
    ),
    host: SITE_URL,
  };
}
