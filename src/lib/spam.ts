import "server-only";
import { supabaseAdmin } from "./supabase";
import { provinceForAreaCode, isCanadianAreaCode } from "./provinces";

// These aggregations power the sitemap, area-code pages, and the homepage grid.
// They run server-side only and use the service-role client so the data is
// complete even before public-read RLS policies are in place.

// Supabase/PostgREST caps each response at 1000 rows regardless of .limit(),
// so we page through results with .range(). PAGE is the per-request size and
// MAX_PAGES is a safety stop (1000 * 500 = 500k rows).
const PAGE = 1000;
const MAX_PAGES = 500;

export type AreaNumber = {
  phone_number: string;
  report_count: number;
  spam_count: number;
  most_common_type: string | null;
  latest_comment: string | null;
};

function mostCommon(items: string[]): string | null {
  if (items.length === 0) return null;
  const counts = new Map<string, number>();
  for (const it of items) counts.set(it, (counts.get(it) ?? 0) + 1);
  let best: string | null = null;
  let bestN = 0;
  for (const [k, n] of counts) {
    if (n > bestN) {
      best = k;
      bestN = n;
    }
  }
  return best;
}

async function fetchAllPhoneNumbers(): Promise<string[]> {
  const set = new Set<string>();
  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * PAGE;
    const { data, error } = await supabaseAdmin
      .from("spam_reports")
      .select("phone_number")
      .order("phone_number", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) {
      console.error("getAllPhoneNumbers failed:", error.message);
      break;
    }
    if (!data || data.length === 0) break;
    for (const r of data) {
      if (r.phone_number && r.phone_number.length === 10) set.add(r.phone_number);
    }
    if (data.length < PAGE) break;
  }
  return Array.from(set);
}

let phoneNumbersCache: { at: number; promise: Promise<string[]> } | null = null;
const PHONE_NUMBERS_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// All distinct, valid 10-digit phone numbers in the database. The sitemap
// renders one shard per request — dozens of shards across ~300k numbers ×
// every locale — and every shard used to independently re-scan the whole
// table for this same list, which was the single largest source of Supabase
// egress on this site. Memoizing per warm process collapses that back down to
// one scan per cache window, however many shards end up sharing the process.
export async function getAllPhoneNumbers(): Promise<string[]> {
  const now = Date.now();
  if (!phoneNumbersCache || now - phoneNumbersCache.at > PHONE_NUMBERS_CACHE_TTL_MS) {
    phoneNumbersCache = { at: now, promise: fetchAllPhoneNumbers() };
  }
  try {
    return await phoneNumbersCache.promise;
  } catch (e) {
    phoneNumbersCache = null;
    throw e;
  }
}

// Distinct-number counts grouped by 3-digit area code, via a single Postgres
// aggregation (see the get_area_code_counts() migration) instead of paging the
// whole table into the app. Falls back to a full scan if the function isn't
// deployed yet, so language landing pages keep working either way.
export async function getAreaCodeCounts(): Promise<Record<string, number>> {
  const { data, error } = await supabaseAdmin.rpc("get_area_code_counts");
  if (error) {
    console.error(
      "get_area_code_counts RPC failed, falling back to full scan:",
      error.message
    );
  } else if (data && typeof data === "object") {
    const counts: Record<string, number> = {};
    for (const [code, n] of Object.entries(data as Record<string, unknown>)) {
      if (typeof n === "number" && n > 0) counts[code] = n;
    }
    if (Object.keys(counts).length > 0) return counts;
  }

  const numbers = await getAllPhoneNumbers();
  const fallback: Record<string, number> = {};
  for (const n of numbers) {
    const code = n.slice(0, 3);
    fallback[code] = (fallback[code] ?? 0) + 1;
  }
  return fallback;
}

const AREA_CODE_ROW_LIMIT = 100;

// Per-number aggregates for a single area code, busiest first. Bounded to the
// AREA_CODE_ROW_LIMIT most recent reports for the code — area pages only ever
// display a handful of numbers, and paging in a high-volume code's entire
// history was a major source of egress. Counts and ranking below reflect
// these recent reports, not the code's full lifetime history.
export async function getNumbersForAreaCode(code: string): Promise<AreaNumber[]> {
  const { data, error } = await supabaseAdmin
    .from("spam_reports")
    .select("phone_number, type, comment, is_spam, created_at")
    .like("phone_number", `${code}%`)
    .order("created_at", { ascending: false })
    .limit(AREA_CODE_ROW_LIMIT);
  if (error) {
    console.error(`getNumbersForAreaCode(${code}) failed:`, error.message);
    return [];
  }
  const rows = data ?? [];

  const byNumber = new Map<string, AreaNumber & { _types: string[] }>();
  for (const r of rows) {
    const pn = r.phone_number as string;
    // `like '416%'` can match an exchange that merely starts with the digits;
    // anchor on the true 3-digit area code.
    if (!pn || pn.length !== 10 || pn.slice(0, 3) !== code) continue;
    let e = byNumber.get(pn);
    if (!e) {
      e = {
        phone_number: pn,
        report_count: 0,
        spam_count: 0,
        most_common_type: null,
        latest_comment: null,
        _types: [],
      };
      byNumber.set(pn, e);
    }
    e.report_count++;
    if (r.is_spam) e.spam_count++;
    if (r.type) e._types.push(r.type as string);
    // Rows are ordered newest-first, so the first comment we see is the latest.
    if (!e.latest_comment && r.comment) e.latest_comment = r.comment as string;
  }

  const out: AreaNumber[] = [];
  for (const e of byNumber.values()) {
    const { _types, ...rest } = e;
    rest.most_common_type = mostCommon(_types);
    out.push(rest);
  }
  out.sort((a, b) => b.report_count - a.report_count);
  return out;
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
  topNumbers: AreaNumber[];
};

type AreaSummaryRow = {
  phone_number?: unknown;
  report_count?: unknown;
  most_common_type?: unknown;
  latest_comment?: unknown;
};

// Derive the summary from a full getNumbersForAreaCode() scan. Used only when
// the RPC is unavailable, so a missing migration degrades to the old (heavier)
// behaviour instead of an empty page.
function summarizeAreaNumbers(numbers: AreaNumber[]): AreaSummary {
  const buckets: Record<string, number> = {};
  for (const n of numbers) {
    const t = n.most_common_type || "Other";
    buckets[t] = (buckets[t] ?? 0) + 1;
  }
  return {
    numberCount: numbers.length,
    reportTotal: numbers.reduce((s, n) => s + n.report_count, 0),
    topType: Object.entries(buckets).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
    topNumbers: numbers.slice(0, 6),
  };
}

export async function getAreaSummary(code: string): Promise<AreaSummary> {
  const { data, error } = await supabaseAdmin.rpc("get_area_summary", {
    p_code: code,
  });
  if (error) {
    console.error(
      `get_area_summary(${code}) RPC failed, falling back to scan:`,
      error.message
    );
    return summarizeAreaNumbers(await getNumbersForAreaCode(code));
  }

  const d = (data ?? {}) as Record<string, unknown>;
  const rows = Array.isArray(d.top_numbers) ? (d.top_numbers as AreaSummaryRow[]) : [];
  return {
    numberCount: typeof d.number_count === "number" ? d.number_count : 0,
    reportTotal: typeof d.report_total === "number" ? d.report_total : 0,
    topType: typeof d.top_type === "string" ? d.top_type : null,
    topNumbers: rows.map((r) => ({
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
  return /^[2-9]\d\d$/.test(code);
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

// Fast path: a single Postgres aggregation (see the get_site_stats() migration)
// instead of paging the whole table into the app. Falls back to a full row scan
// if the function is missing or returns nothing usable, so the homepage keeps
// working either way.
export async function getSiteStats(): Promise<SiteStats> {
  const { data, error } = await supabaseAdmin.rpc("get_site_stats");
  if (error) {
    console.error(
      "get_site_stats RPC failed, falling back to scan:",
      error.message
    );
    return getSiteStatsByScan();
  }
  const norm = normalizeStatsPayload(data);
  if (!norm) {
    console.error(
      "get_site_stats returned an unrecognized payload, falling back to scan"
    );
    return getSiteStatsByScan();
  }
  return deriveSiteStats(
    norm.totalNumbers,
    norm.totalReports,
    norm.typeCounts,
    norm.areaCodeCounts
  );
}

// Fallback aggregation: page through spam_reports and roll the stats up in the
// app. Slow on large tables — kept only for databases where get_site_stats()
// isn't present.
async function getSiteStatsByScan(): Promise<SiteStats> {
  const numbers = new Set<string>();
  const typeCounts: Record<string, number> = {};
  let totalReports = 0;

  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * PAGE;
    const { data, error } = await supabaseAdmin
      .from("spam_reports")
      .select("phone_number, type, is_spam")
      .order("phone_number", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) {
      console.error("getSiteStatsByScan failed:", error.message);
      break;
    }
    if (!data || data.length === 0) break;
    for (const r of data) {
      const pn = r.phone_number as string | null;
      if (!pn || pn.length !== 10) continue;
      totalReports++;
      numbers.add(pn);
      // Only count concrete spam categories toward "most common type".
      if (r.is_spam && r.type) {
        typeCounts[r.type] = (typeCounts[r.type] ?? 0) + 1;
      }
    }
    if (data.length < PAGE) break;
  }

  const areaCodeCounts: Record<string, number> = {};
  for (const n of numbers) {
    const code = n.slice(0, 3);
    areaCodeCounts[code] = (areaCodeCounts[code] ?? 0) + 1;
  }

  return deriveSiteStats(numbers.size, totalReports, typeCounts, areaCodeCounts);
}

export type TrendingNumber = {
  phone_number: string;
  type: string | null;
  comment: string | null;
  created_at: string;
};

// The most recently reported distinct spam numbers, newest first. Powers the
// homepage "Trending this week" strip.
export async function getTrendingNumbers(limit = 5): Promise<TrendingNumber[]> {
  // Already scoped (is_spam filter + needed columns only) rather than a full
  // scan. 100 rows gives good odds of finding `limit` distinct numbers among
  // recent reports without over-fetching.
  const { data, error } = await supabaseAdmin
    .from("spam_reports")
    .select("phone_number, type, comment, created_at")
    .eq("is_spam", true)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    console.error("getTrendingNumbers failed:", error.message);
    return [];
  }

  const seen = new Set<string>();
  const out: TrendingNumber[] = [];
  for (const r of data ?? []) {
    const pn = r.phone_number as string | null;
    if (!pn || pn.length !== 10 || seen.has(pn)) continue;
    seen.add(pn);
    out.push({
      phone_number: pn,
      type: r.type ?? null,
      comment: r.comment ?? null,
      created_at: r.created_at as string,
    });
    if (out.length >= limit) break;
  }
  return out;
}
