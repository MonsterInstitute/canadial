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

// All distinct, valid 10-digit phone numbers in the database.
export async function getAllPhoneNumbers(): Promise<string[]> {
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

// Distinct-number counts grouped by 3-digit area code.
export async function getAreaCodeCounts(): Promise<Record<string, number>> {
  const numbers = await getAllPhoneNumbers();
  const counts: Record<string, number> = {};
  for (const n of numbers) {
    const code = n.slice(0, 3);
    counts[code] = (counts[code] ?? 0) + 1;
  }
  return counts;
}

// Per-number aggregates for a single area code, busiest first.
export async function getNumbersForAreaCode(code: string): Promise<AreaNumber[]> {
  const rows: {
    phone_number: string;
    type: string | null;
    comment: string | null;
    is_spam: boolean | null;
    created_at: string;
  }[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * PAGE;
    const { data, error } = await supabaseAdmin
      .from("spam_reports")
      .select("phone_number, type, comment, is_spam, created_at")
      .like("phone_number", `${code}%`)
      .order("created_at", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) {
      console.error(`getNumbersForAreaCode(${code}) failed:`, error.message);
      break;
    }
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE) break;
  }

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

// Fast path: a single Postgres aggregation (see the get_site_stats() migration)
// instead of paging the whole table into the app. Falls back to a full row scan
// if the function hasn't been applied to the database yet, so the homepage keeps
// working either way.
export async function getSiteStats(): Promise<SiteStats> {
  const { data, error } = await supabaseAdmin.rpc("get_site_stats");
  if (error || !data) {
    if (error) {
      console.error(
        "get_site_stats RPC failed, falling back to scan:",
        error.message
      );
    }
    return getSiteStatsByScan();
  }
  const d = data as {
    total_numbers?: number;
    total_reports?: number;
    type_counts?: Record<string, number>;
    area_codes?: Record<string, number>;
  };
  return deriveSiteStats(
    d.total_numbers ?? 0,
    d.total_reports ?? 0,
    d.type_counts ?? {},
    d.area_codes ?? {}
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
  const { data, error } = await supabaseAdmin
    .from("spam_reports")
    .select("phone_number, type, comment, created_at")
    .eq("is_spam", true)
    .order("created_at", { ascending: false })
    .limit(300);
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
