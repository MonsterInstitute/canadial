import type { MetadataRoute } from "next";
import { getAreaCodeCounts } from "@/lib/spam";
import { getReportableMonths } from "@/lib/reports";
import { LOCALES } from "@/lib/i18n";
import { SITE_URL } from "@/lib/config";

// Revalidate daily.
export const revalidate = 86400;

const LANGS = LOCALES.filter((l) => l.code !== "en");

// A single sitemap: core pages plus one entry per area code (English only —
// translated lookup/area pages were dropped, they were never indexed and
// were the entire reason this used to be split into ~330 shards that each
// re-scanned the whole spam_reports table). getAreaCodeCounts() is a single
// Postgres aggregation, not a table scan, so this whole file is now cheap
// regardless of how many numbers the database holds.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
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

  // Area-code pages — English only (see module comment).
  const areaCodeCounts = await getAreaCodeCounts();
  for (const code of Object.keys(areaCodeCounts)) {
    entries.push({
      url: `${SITE_URL}/area/${code}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    });
  }

  return entries;
}
