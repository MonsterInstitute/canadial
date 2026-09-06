import type { MetadataRoute } from "next";
import { getAreaCodeCounts, getIndexableNumbers } from "@/lib/spam";
import { getReportableMonths } from "@/lib/reports";
import { LOCALES } from "@/lib/i18n";
import { SITE_URL } from "@/lib/config";

// Revalidate daily.
export const revalidate = 86400;

const LANGS = LOCALES.filter((l) => l.code !== "en");

// A single sitemap: core pages, one entry per area code, and the number pages
// that carry something specific enough to be worth indexing — reported more
// than once, or a verified organization (~11.3k of ~307k).
//
// Both database reads are single Postgres aggregations rather than table
// scans, so this stays cheap however large spam_reports grows. That is the
// whole point: this file once sharded into ~330 sitemaps that each re-scanned
// the table, which is what exhausted the egress quota.
//
// The ~296k single-report numbers are left out on purpose. They are not
// excluded to save egress — a number page costs 1,473 bytes to render, so all
// of them would fit — but because 281k FTC rows share 20 boilerplate comment
// texts, and Google already crawled those pages when the sitemap listed 3.3M
// URLs and chose not to index them. Listing them spends crawl budget to be
// ignored. Raising the bar is a content problem, not a sitemap one.
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

  // Number pages worth indexing. Lower priority than area pages: these are the
  // long tail, and area pages are the hubs that link to them.
  const numbers = await getIndexableNumbers();
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
