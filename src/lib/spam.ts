import "server-only";
import { supabaseAdmin } from "./supabase";

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
