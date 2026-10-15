import "server-only";
import { supabaseAdmin } from "./supabase";
import { regionForCode } from "./area-codes";
import { provinceForAreaCode } from "./provinces";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function monthName(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1] ?? "?"} ${year}`;
}

export type TypeStat = { type: string; count: number; pct: number };
export type CodeStat = { code: string; region: string; count: number };
export type ProvinceStat = { province: string; count: number; pct: number };
export type NumberStat = { phone_number: string; count: number; type: string | null };

export type MonthlyReport = {
  year: number;
  month: number;
  label: string;
  totalNumbersAllTime: number;
  monthNumbers: number;
  monthReports: number;
  newThisMonth: number;
  typeBreakdown: TypeStat[];
  topType: string | null;
  topAreaCodes: CodeStat[];
  provinceBreakdown: ProvinceStat[];
  topProvince: string | null;
  topNumbers: NumberStat[];
  prevMonthNumbers: number | null;
  pctChange: number | null;
};

// The aggregates for one month, as materialized by refresh_monthly_reports()
// (see the 20261015120000 migration). Province and region rollups happen here
// because the area-code -> province mapping lives in TypeScript.
type MonthlyPayload = {
  total_numbers_all_time?: unknown;
  month_numbers?: unknown;
  month_reports?: unknown;
  new_this_month?: unknown;
  prev_month_numbers?: unknown;
  type_counts?: unknown;
  area_code_counts?: unknown;
  top_numbers?: unknown;
};

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function counts(v: unknown): Map<string, number> {
  const out = new Map<string, number>();
  if (v && typeof v === "object") {
    for (const [k, n] of Object.entries(v as Record<string, unknown>)) {
      if (typeof n === "number" && n > 0) out.set(k, n);
    }
  }
  return out;
}

function ymKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

// Months that have a materialized report, newest first. One read of a table
// with a row per month. Throws on a database error: an empty list here would
// drop every month from the index pages and the sitemap, and prerender none.
export async function getReportableMonths(): Promise<{ year: number; month: number }[]> {
  const { data, error } = await supabaseAdmin.rpc("get_reportable_months");
  if (error) throw new Error(`get_reportable_months: ${error.message}`);
  if (!Array.isArray(data)) return [];
  const months: { year: number; month: number }[] = [];
  for (const ym of data as unknown[]) {
    const m = typeof ym === "string" ? ym.match(/^(\d{4})-(\d{2})$/) : null;
    if (m) months.push({ year: Number(m[1]), month: Number(m[2]) });
  }
  return months;
}

// One month's report: a primary-key read of monthly_reports. This used to page
// the entire spam_reports table into the app on every render — the egress
// burn and build timeouts described in the migration. Returns null only when
// the month genuinely has no report (the page then 404s); a database error
// throws, so ISR keeps serving the last good copy instead of caching a 404.
//
// No scan fallback, on purpose: the fallback would be the full-table read this
// replaced.
export async function getMonthlyReport(
  year: number,
  month: number
): Promise<MonthlyReport | null> {
  const { data, error } = await supabaseAdmin.rpc("get_monthly_report", {
    p_ym: ymKey(year, month),
  });
  if (error) throw new Error(`get_monthly_report(${ymKey(year, month)}): ${error.message}`);
  if (!data || typeof data !== "object") return null;
  const d = data as MonthlyPayload;

  const monthNumbers = num(d.month_numbers);
  const monthReports = num(d.month_reports);
  if (monthNumbers === 0) return null;

  // Type breakdown (by report).
  const typeBreakdown: TypeStat[] = Array.from(counts(d.type_counts).entries())
    .map(([type, count]) => ({ type, count, pct: (count / monthReports) * 100 }))
    .sort((a, b) => b.count - a.count);
  // "Most active scam type" — the dominant *named* threat, ignoring the
  // catch-all "Other" bucket so the headline reflects a real category.
  const topType =
    typeBreakdown.find((t) => t.type !== "Other")?.type ??
    typeBreakdown[0]?.type ??
    null;

  // Area-code counts (distinct numbers).
  const codeCounts = counts(d.area_code_counts);
  const topAreaCodes: CodeStat[] = Array.from(codeCounts.entries())
    .map(([code, count]) => ({ code, region: regionForCode(code) ?? "—", count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Province breakdown (distinct numbers).
  const provCounts = new Map<string, number>();
  for (const [code, count] of codeCounts) {
    const prov = provinceForAreaCode(code);
    provCounts.set(prov, (provCounts.get(prov) ?? 0) + count);
  }
  const provinceBreakdown: ProvinceStat[] = Array.from(provCounts.entries())
    .map(([province, count]) => ({
      province,
      count,
      pct: (count / monthNumbers) * 100,
    }))
    .sort((a, b) => b.count - a.count);
  const topProvince =
    provinceBreakdown.find((p) => p.province !== "Toll-free" && p.province !== "Other / Unknown")
      ?.province ?? provinceBreakdown[0]?.province ?? null;

  // Top reported numbers this month (already ranked and capped in SQL).
  const topNumbers: NumberStat[] = Array.isArray(d.top_numbers)
    ? (d.top_numbers as { phone_number?: unknown; count?: unknown; type?: unknown }[]).map(
        (r) => ({
          phone_number: String(r.phone_number ?? ""),
          count: num(r.count),
          type: typeof r.type === "string" ? r.type : null,
        })
      )
    : [];

  const prev = num(d.prev_month_numbers);
  const prevMonthNumbers = prev > 0 ? prev : null;
  const pctChange =
    prevMonthNumbers !== null
      ? ((monthNumbers - prevMonthNumbers) / prevMonthNumbers) * 100
      : null;

  return {
    year,
    month,
    label: monthName(year, month),
    totalNumbersAllTime: num(d.total_numbers_all_time),
    monthNumbers,
    monthReports,
    newThisMonth: num(d.new_this_month),
    typeBreakdown,
    topType,
    topAreaCodes,
    provinceBreakdown,
    topProvince,
    topNumbers,
    prevMonthNumbers,
    pctChange,
  };
}
