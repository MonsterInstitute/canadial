import "server-only";
import { all, first } from "./d1";
import { provinceForAreaCode, isCanadianAreaCode } from "./provinces";
import { isValidAreaCode } from "./phone";

// These aggregations power the sitemap, area-code pages, the homepage and the
// number pages. All of them read D1, and all of them are bounded: rollups are
// materialized by refreshAll() (src/lib/refresh.ts) and read by primary key,
// lists come off an index with a LIMIT. Nothing here counts or scans rows at
// render time — that is the invariant that kept Supabase inside its egress
// budget, and on D1 it is what keeps rows-read per render constant.
//
// Errors throw (src/lib/d1.ts): a failed read is never "no data".

export type AreaNumber = {
  phone_number: string;
  report_count: number;
  spam_count: number;
  most_common_type: string | null;
  latest_comment: string | null;
};

// Distinct-number counts grouped by 3-digit area code, from the materialized
// area summaries (one row per valid code).
export async function getAreaCodeCounts(): Promise<Record<string, number>> {
  const rows = await all<{ code: number; n: number }>(
    "SELECT code, json_extract(payload, '$.number_count') AS n FROM area_summaries2"
  );
  const counts: Record<string, number> = {};
  for (const r of rows) {
    const code = String(r.code).padStart(3, "0");
    if (typeof r.n === "number" && r.n > 0 && isValidAreaCode(code)) counts[code] = r.n;
  }
  return counts;
}

// Just enough about an area code to render the context blocks on a number
// page: the headline counts, the modal caller type, and a few numbers to link
// to. See the get_area_summary() migration for why this exists — the number
// pages are the highest-volume route on the site (~336k of them), so this is
// the one read path where payload size actually decides whether the monthly
// egress budget holds.
export type AreaSummary = {
  numberCount: number;
  reportTotal: number;
  topType: string | null;
  // Distinct numbers grouped by their modal caller type, "Other" covering
  // untyped numbers. Exact over the whole area code, not just topNumbers.
  typeCounts: Record<string, number>;
  topNumbers: AreaNumber[];
};

type AreaSummaryRow = {
  phone_number?: unknown;
  report_count?: unknown;
  most_common_type?: unknown;
  latest_comment?: unknown;
};

// `limit` caps only the returned number list; the counts are exact over the
// whole area code either way. Number pages want a handful of related numbers,
// area pages want a page's worth.
export async function getAreaSummary(
  code: string,
  limit = 6
): Promise<AreaSummary> {
  // One row by primary key from the materialized area_summaries table (the
  // daily job refreshes it). No row means the code has no reported numbers.
  const row = await first<{ payload: string }>(
    "SELECT payload FROM area_summaries2 WHERE code = ?",
    Number(code)
  );
  const data: unknown = row ? JSON.parse(row.payload) : {};

  const d = (data ?? {}) as Record<string, unknown>;
  const rows = Array.isArray(d.top_numbers) ? (d.top_numbers as AreaSummaryRow[]) : [];
  return {
    numberCount: typeof d.number_count === "number" ? d.number_count : 0,
    reportTotal: typeof d.report_total === "number" ? d.report_total : 0,
    topType: typeof d.top_type === "string" ? d.top_type : null,
    typeCounts: toNumberMap(d.type_counts),
    topNumbers: rows.slice(0, limit).map((r) => ({
      phone_number: String(r.phone_number ?? ""),
      report_count: typeof r.report_count === "number" ? r.report_count : 0,
      // spam_count isn't part of the summary — the number pages never read it.
      spam_count: 0,
      most_common_type:
        typeof r.most_common_type === "string" ? r.most_common_type : null,
      latest_comment:
        typeof r.latest_comment === "string" ? r.latest_comment : null,
    })),
  };
}

// The number pages worth listing in the sitemap: numbers reported more than
// once (numbers.listed, set by refreshAll()), plus every verified
// organization. The ~440k single-report numbers are deliberately left out —
// most share a handful of boilerplate comment texts and Google already
// declined to index them once. Phase 5 revisits this with real per-number data.
//
// One partial-index read per sitemap render (daily).
export async function getIndexableNumbers(): Promise<string[]> {
  const rows = await all<{ phone: number }>(
    `SELECT phone FROM numbers WHERE listed = 1
     UNION
     SELECT phone FROM organizations WHERE phone >= 2000000000
     ORDER BY phone`
  );
  return rows.map((r) => String(r.phone));
}

export type SiteStats = {
  totalNumbers: number;
  totalReports: number;
  mostCommonType: string | null;
  typeCounts: Record<string, number>;
  // Distinct reported numbers grouped by 3-digit area code.
  areaCodeCounts: Record<string, number>;
  // Distinct reported numbers grouped by province (geographic codes only),
  // used for the "most active province" stat and the Canada heatmap.
  provinceCounts: Record<string, number>;
  topProvince: { name: string; count: number } | null;
};

// Build the full SiteStats shape from three raw aggregates: the distinct-number
// total, per-type report counts, and per-area-code distinct-number counts.
// Province rollups, most-common type, and busiest province are derived here so
// the area-code → province mapping lives in exactly one place. Shared by the
// fast RPC path and the row-scan fallback.
function deriveSiteStats(
  totalNumbers: number,
  totalReports: number,
  typeCounts: Record<string, number>,
  areaCodeCounts: Record<string, number>
): SiteStats {
  const provinceCounts: Record<string, number> = {};
  for (const [code, count] of Object.entries(areaCodeCounts)) {
    // The heatmap and "most active province" only make sense for real
    // geographic area codes — skip toll-free and unrecognised codes.
    if (isCanadianAreaCode(code)) {
      const prov = provinceForAreaCode(code);
      provinceCounts[prov] = (provinceCounts[prov] ?? 0) + count;
    }
  }

  const mostCommonType =
    Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const topEntry = Object.entries(provinceCounts).sort(
    (a, b) => b[1] - a[1]
  )[0];
  const topProvince = topEntry
    ? { name: topEntry[0], count: topEntry[1] }
    : null;

  return {
    totalNumbers,
    totalReports,
    mostCommonType,
    typeCounts,
    areaCodeCounts,
    provinceCounts,
    topProvince,
  };
}

// A real NANP area code never starts with 0 or 1. Used to drop junk keys
// (e.g. "000", "010") that appear when a stats function doesn't filter to valid
// 10-digit numbers.
function isPlausibleAreaCode(code: string): boolean {
  return isValidAreaCode(code);
}

function toNumberMap(
  value: unknown,
  keyFilter?: (key: string) => boolean
): Record<string, number> {
  const out: Record<string, number> = {};
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (typeof v === "number" && v > 0 && (!keyFilter || keyFilter(k))) {
        out[k] = v;
      }
    }
  }
  return out;
}

// Normalize whatever get_site_stats() returns into the raw aggregates
// deriveSiteStats() needs. Accepts both the canonical shape from our migration
// (total_numbers / type_counts / area_codes) and a flatter shape
// (total / scam,telemarketer,robocall,debt / area_counts), so the homepage keeps
// working regardless of which version of the function is installed. Returns null
// when the payload carries no usable data (caller then falls back to a scan).
function normalizeStatsPayload(
  raw: unknown
): { totalNumbers: number; totalReports: number; typeCounts: Record<string, number>; areaCodeCounts: Record<string, number> } | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;

  const num = (v: unknown) => (typeof v === "number" ? v : 0);

  // Canonical shape.
  if ("area_codes" in d || "total_numbers" in d || "type_counts" in d) {
    const areaCodeCounts = toNumberMap(d.area_codes, isPlausibleAreaCode);
    const typeCounts = toNumberMap(d.type_counts);
    const totalNumbers = num(d.total_numbers);
    const totalReports = num(d.total_reports) || totalNumbers;
    if (totalNumbers > 0 || Object.keys(areaCodeCounts).length > 0) {
      return { totalNumbers, totalReports, typeCounts, areaCodeCounts };
    }
    return null;
  }

  // Flat shape: { total, scam, telemarketer, robocall, debt, area_counts }.
  if ("area_counts" in d || "total" in d) {
    const areaCodeCounts = toNumberMap(d.area_counts, isPlausibleAreaCode);
    const typeCounts: Record<string, number> = {};
    for (const [key, label] of [
      ["scam", "Scam"],
      ["telemarketer", "Telemarketer"],
      ["robocall", "Robocall"],
      ["debt", "Debt Collector"],
    ] as const) {
      const n = num(d[key]);
      if (n > 0) typeCounts[label] = n;
    }
    const totalNumbers = num(d.total);
    if (totalNumbers > 0 || Object.keys(areaCodeCounts).length > 0) {
      return { totalNumbers, totalReports: totalNumbers, typeCounts, areaCodeCounts };
    }
    return null;
  }

  return null;
}

// One primary-key read of the materialized site_stats row.
export async function getSiteStats(): Promise<SiteStats> {
  const row = await first<{ payload: string }>("SELECT payload FROM site_stats2 WHERE id = 1");
  const norm = normalizeStatsPayload(row ? JSON.parse(row.payload) : null);
  if (!norm) throw new Error("site_stats is empty; run the refresh (src/lib/refresh.ts)");
  return deriveSiteStats(
    norm.totalNumbers,
    norm.totalReports,
    norm.typeCounts,
    norm.areaCodeCounts
  );
}

export type TrendingNumber = {
  phone_number: string;
  type: string | null;
  comment: string | null;
  created_at: string;
};

// "Trending": the numbers with the most complaints in the latest FTC daily
// file (ftc_daily_top, written by the ingest). One primary-key range read.
export async function getTrendingNumbers(limit = 5): Promise<TrendingNumber[]> {
  const rows = await all<{ day: string; phone: number; n: number }>(
    `SELECT day, phone, n FROM ftc_daily_top
     WHERE day = (SELECT max(day) FROM ftc_daily_top) ORDER BY rank LIMIT ?`,
    limit
  );
  return rows.map((r) => ({
    phone_number: String(r.phone),
    type: null,
    comment: `${r.n.toLocaleString("en-CA")} FTC complaint${r.n === 1 ? "" : "s"} in one day`,
    created_at: r.day,
  }));
}
