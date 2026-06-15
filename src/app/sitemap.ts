import type { MetadataRoute } from "next";
import { getAllPhoneNumbers } from "@/lib/spam";
import { getReportableMonths } from "@/lib/reports";
import { LOCALES } from "@/lib/i18n";
import { CHUNK_SIZE, planShards, lookupPrefix } from "@/lib/sitemap-shards";
import { SITE_URL } from "@/lib/config";

// Revalidate hourly as new numbers get reported.
export const revalidate = 3600;

const LANGS = LOCALES.filter((l) => l.code !== "en");

// One sitemap per (locale × 10k-number chunk), plus a core shard. The number of
// chunks grows automatically with the database, so no shard ever exceeds
// Google's 50,000-URL limit.
export async function generateSitemaps() {
  const numbers = await getAllPhoneNumbers();
  return planShards(numbers.length).map((_, id) => ({ id }));
}

export default async function sitemap({
  id,
}: {
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const numbers = await getAllPhoneNumbers();
  const shards = planShards(numbers.length);
  const shard = shards[Number(await id)] ?? { kind: "core" as const };
  const now = new Date();

  if (shard.kind === "core") {
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
    // Developer/API pages.
    for (const path of ["/api-docs", "/pricing", "/api-keys"]) {
      entries.push({
        url: `${SITE_URL}${path}`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }

    // Monthly spam-call reports (English + each non-English locale).
    const reportMonths = await getReportableMonths();
    const reportRoots = ["", ...LANGS.map((l) => l.path)]; // "" = English
    for (const root of reportRoots) {
      entries.push({
        url: `${SITE_URL}${root}/reports`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.7,
      });
      for (const { year, month } of reportMonths) {
        entries.push({
          url: `${SITE_URL}${root}/reports/${year}/${String(month).padStart(2, "0")}`,
          lastModified: now,
          changeFrequency: "monthly",
          priority: root === "" ? 0.8 : 0.6,
        });
      }
    }

    // Know Your Rights — English plus one per non-English locale.
    entries.push({
      url: `${SITE_URL}/rights`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    });
    for (const l of LANGS) {
      entries.push({
        url: `${SITE_URL}${l.path}/rights`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }

    // Area-code pages — English plus one per non-English locale.
    const areaCodes = new Set<string>();
    for (const n of numbers) areaCodes.add(n.slice(0, 3));
    for (const code of areaCodes) {
      entries.push({
        url: `${SITE_URL}/area/${code}`,
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.8,
      });
      for (const l of LANGS) {
        entries.push({
          url: `${SITE_URL}${l.path}/area/${code}`,
          lastModified: now,
          changeFrequency: "daily",
          priority: 0.7,
        });
      }
    }
    return entries;
  }

  // Lookup shard: one locale, one 10k slice of the (sorted, de-duplicated)
  // number list. Slicing the same array by the same chunk size keeps shards
  // consistent between generateSitemaps() and here.
  const start = shard.chunk * CHUNK_SIZE;
  const slice = numbers.slice(start, start + CHUNK_SIZE);
  const prefix = lookupPrefix(shard.code);
  const priority = shard.code === "en" ? 0.6 : 0.5;
  return slice.map((n) => ({
    url: `${SITE_URL}${prefix}/lookup/${n}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority,
  }));
}
