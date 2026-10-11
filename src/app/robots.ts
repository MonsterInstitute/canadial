import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

export const revalidate = 86400;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The JSON API (e.g. /api/v1/lookup) returns data, not indexable pages.
      // /app/ is the noindexed duplicate interface (see src/app/app/layout.tsx);
      // its per-number result pages are rendered per request, so crawling them
      // is pure cost.
      disallow: ["/api/", "/app/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
