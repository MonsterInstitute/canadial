import { getAreaCodeCounts } from "@/lib/spam";
import { getReportableMonths } from "@/lib/reports";
import { LOCALES } from "@/lib/i18n";
import { HUBS } from "@/lib/hubs";
import { PROVINCE_PAGES } from "@/lib/provinces";
import { latestFtcDay } from "@/lib/hub-data";
import { organizationNumbers, urlset } from "@/lib/sitemap-data";

// Everything that isn't a number or block page: home and language pages,
// reports, rights, call-type hubs, trending, provinces, area codes, trust
// pages, and verified organizations' numbers.
export const revalidate = 86400;

const LANGS = LOCALES.filter((l) => l.code !== "en");

export async function GET() {
  const [day, months, codes, orgs] = await Promise.all([latestFtcDay(), getReportableMonths(), getAreaCodeCounts(), organizationNumbers()]);
  const e: { loc: string; lastmod?: string | null }[] = [{ loc: "/", lastmod: day }];
  for (const l of LANGS) e.push({ loc: l.path });
  for (const p of ["/api-docs", "/pricing", "/api-keys", "/about", "/methodology", "/privacy", "/contact", "/removal"]) e.push({ loc: p });
  e.push({ loc: "/trending", lastmod: day }, { loc: "/scams", lastmod: day });
  for (const h of HUBS) e.push({ loc: `/scams/${h.slug}`, lastmod: day });
  for (const p of PROVINCE_PAGES) e.push({ loc: `/province/${p.slug}`, lastmod: day });
  for (const root of ["", ...LANGS.map((l) => l.path)]) {
    e.push({ loc: `${root}/reports`, lastmod: day });
    for (const { year, month } of months) e.push({ loc: `${root}/reports/${year}/${String(month).padStart(2, "0")}` });
  }
  e.push({ loc: "/rights" });
  for (const l of LANGS) e.push({ loc: `${l.path}/rights` });
  for (const code of Object.keys(codes)) e.push({ loc: `/area/${code}`, lastmod: day });
  for (const n of orgs) e.push({ loc: `/lookup/${n}` });
  return urlset(e);
}
