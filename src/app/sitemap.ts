import type { MetadataRoute } from "next";
import { getAllPhoneNumbers } from "@/lib/spam";
import { SITE_URL } from "@/lib/config";

// Revalidate the sitemap hourly as new numbers get reported.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: "daily", priority: 1 },
  ];

  const numbers = await getAllPhoneNumbers();

  // Area-code landing pages, derived from the numbers we actually have.
  const areaCodes = new Set<string>();
  for (const n of numbers) areaCodes.add(n.slice(0, 3));
  for (const code of areaCodes) {
    entries.push({
      url: `${SITE_URL}/area/${code}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    });
  }

  // One entry per individual phone-number page.
  for (const phone of numbers) {
    entries.push({
      url: `${SITE_URL}/lookup/${phone}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  return entries;
}
