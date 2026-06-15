import type { MetadataRoute } from "next";
import { getAllPhoneNumbers } from "@/lib/spam";
import { LOCALES } from "@/lib/i18n";
import { SITE_URL } from "@/lib/config";

// Revalidate hourly as new numbers get reported.
export const revalidate = 3600;

const LANGS = LOCALES.filter((l) => l.code !== "en"); // 10 non-English locales

// Google caps each sitemap at 50,000 URLs. With ~4.4k numbers × 10 languages
// (~44k) plus the core pages, a single file would blow past that, so we shard:
// shard 0 = core pages + English lookups; shards 1..N = each language's lookups.
const SHARDS: string[] = ["pages", ...LANGS.map((l) => l.code)];

export async function generateSitemaps() {
  return SHARDS.map((_, id) => ({ id }));
}

export default async function sitemap({
  id,
}: {
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const idx = Number(await id);
  const shard = SHARDS[idx] ?? "pages";
  const now = new Date();
  const numbers = await getAllPhoneNumbers();

  if (shard === "pages") {
    const entries: MetadataRoute.Sitemap = [
      { url: SITE_URL, lastModified: now, changeFrequency: "daily", priority: 1 },
    ];

    // Language landing pages.
    for (const l of LANGS) {
      entries.push({
        url: `${SITE_URL}${l.path}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.9,
      });
    }

    // Area-code pages.
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

    // English number pages.
    for (const n of numbers) {
      entries.push({
        url: `${SITE_URL}/lookup/${n}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }

    return entries;
  }

  // Language shard: that language's number pages.
  return numbers.map((n) => ({
    url: `${SITE_URL}/${shard}/lookup/${n}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.5,
  }));
}
