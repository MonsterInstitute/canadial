import "server-only";
import { supabaseAdmin } from "./supabase";
import { regionForCode } from "./area-codes";
import { provinceForAreaCode } from "./provinces";

const PAGE = 1000;
const MAX_PAGES = 500;

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function monthName(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1] ?? "?"} ${year}`;
}

type Row = {
  phone_number: string;
  type: string | null;
  created_at: string;
};

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

function ym(dateStr: string): string {
  // "2026-06-15T..." -> "2026-06"
  return dateStr.slice(0, 7);
}

async function fetchAllRows(): Promise<Row[]> {
  const rows: Row[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * PAGE;
    const { data, error } = await supabaseAdmin
      .from("spam_reports")
      .select("phone_number, type, created_at")
      .eq("hidden", false)
      .order("phone_number", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) {
      console.error("reports.fetchAllRows failed:", error.message);
      break;
    }
    if (!data || data.length === 0) break;
    rows.push(...(data as Row[]));
    if (data.length < PAGE) break;
  }
  return rows;
}

// Distinct year-months that actually contain reports, newest first.
export async function getReportableMonths(): Promise<{ year: number; month: number }[]> {
  const { data: minData } = await supabaseAdmin
    .from("spam_reports")
    .select("created_at")
    .eq("hidden", false)
    .order("created_at", { ascending: true })
    .limit(1);
  const { data: maxData } = await supabaseAdmin
    .from("spam_reports")
    .select("created_at")
    .eq("hidden", false)
    .order("created_at", { ascending: false })
    .limit(1);
  if (!minData?.length || !maxData?.length) return [];

  const start = new Date(minData[0].created_at);
  const end = new Date(maxData[0].created_at);
  const months: { year: number; month: number }[] = [];
  let y = start.getUTCFullYear();
  let m = start.getUTCMonth(); // 0-based
  while (y < end.getUTCFullYear() || (y === end.getUTCFullYear() && m <= end.getUTCMonth())) {
    months.push({ year: y, month: m + 1 });
    m++;
    if (m > 11) {
      m = 0;
      y++;
    }
  }
  return months.reverse();
}

function mostCommon(items: string[]): string | null {
  if (!items.length) return null;
  const c = new Map<string, number>();
  for (const it of items) c.set(it, (c.get(it) ?? 0) + 1);
  let best: string | null = null;
  let bestN = -1;
  for (const [k, n] of c) if (n > bestN) [best, bestN] = [k, n];
  return best;
}

export async function getMonthlyReport(
  year: number,
  month: number
): Promise<MonthlyReport | null> {
  const rows = await fetchAllRows();
  if (!rows.length) return null;

  const target = `${year}-${String(month).padStart(2, "0")}`;
  // previous month
  const prevDate = new Date(Date.UTC(year, month - 2, 1));
  const prevTarget = `${prevDate.getUTCFullYear()}-${String(
    prevDate.getUTCMonth() + 1
  ).padStart(2, "0")}`;

  // First-seen month per distinct number (for "new this month") + all-time set.
  const firstSeen = new Map<string, string>();
  const allNumbers = new Set<string>();
  for (const r of rows) {
    if (!r.phone_number || r.phone_number.length !== 10) continue;
    allNumbers.add(r.phone_number);
    const seen = firstSeen.get(r.phone_number);
    if (!seen || r.created_at < seen) firstSeen.set(r.phone_number, r.created_at);
  }

  const monthRows = rows.filter(
    (r) => r.phone_number?.length === 10 && ym(r.created_at) === target
  );
  if (!monthRows.length) return null;

  // Distinct numbers this month, and report counts / types per number.
  const monthNumberSet = new Set<string>();
  const reportsPerNumber = new Map<string, number>();
  const typesPerNumber = new Map<string, string[]>();
  const typeCounts = new Map<string, number>();
  for (const r of monthRows) {
    monthNumberSet.add(r.phone_number);
    reportsPerNumber.set(r.phone_number, (reportsPerNumber.get(r.phone_number) ?? 0) + 1);
    if (r.type) {
      typeCounts.set(r.type, (typeCounts.get(r.type) ?? 0) + 1);
      const arr = typesPerNumber.get(r.phone_number) ?? [];
      arr.push(r.type);
      typesPerNumber.set(r.phone_number, arr);
    }
  }

  // New this month = numbers whose first-ever report is in this month.
  let newThisMonth = 0;
  for (const n of monthNumberSet) {
    if (ym(firstSeen.get(n)!) === target) newThisMonth++;
  }

  // Type breakdown (by report).
  const typeBreakdown: TypeStat[] = Array.from(typeCounts.entries())
    .map(([type, count]) => ({ type, count, pct: (count / monthRows.length) * 100 }))
    .sort((a, b) => b.count - a.count);
  // "Most active scam type" — the dominant *named* threat, ignoring the
  // catch-all "Other" bucket so the headline reflects a real category.
  const topType =
    typeBreakdown.find((t) => t.type !== "Other")?.type ??
    typeBreakdown[0]?.type ??
    null;

  // Area-code counts (distinct numbers).
  const codeCounts = new Map<string, number>();
  for (const n of monthNumberSet) {
    const code = n.slice(0, 3);
    codeCounts.set(code, (codeCounts.get(code) ?? 0) + 1);
  }
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
      pct: (count / monthNumberSet.size) * 100,
    }))
    .sort((a, b) => b.count - a.count);
  const topProvince =
    provinceBreakdown.find((p) => p.province !== "Toll-free" && p.province !== "Other / Unknown")
      ?.province ?? provinceBreakdown[0]?.province ?? null;

  // Top reported numbers this month.
  const topNumbers: NumberStat[] = Array.from(reportsPerNumber.entries())
    .map(([phone_number, count]) => ({
      phone_number,
      count,
      type: mostCommon(typesPerNumber.get(phone_number) ?? []),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Previous month (distinct numbers) for % change.
  const prevNumbers = new Set<string>();
  for (const r of rows) {
    if (r.phone_number?.length === 10 && ym(r.created_at) === prevTarget) {
      prevNumbers.add(r.phone_number);
    }
  }
  const prevMonthNumbers = prevNumbers.size > 0 ? prevNumbers.size : null;
  const pctChange =
    prevMonthNumbers !== null
      ? ((monthNumberSet.size - prevMonthNumbers) / prevMonthNumbers) * 100
      : null;

  return {
    year,
    month,
    label: monthName(year, month),
    totalNumbersAllTime: allNumbers.size,
    monthNumbers: monthNumberSet.size,
    monthReports: monthRows.length,
    newThisMonth,
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
