import "server-only";
import { run } from "./d1";

// Everything derived from `reports`: per-number counters, the sitemap flag,
// and the materialized rollups that pages read by primary key (area_summaries,
// site_stats, monthly_reports).
//
// Ported from the Supabase functions (get_area_summary_live,
// refresh_area_summaries, get_site_stats, compute_monthly_report,
// get_indexable_numbers) with the same filters and tie-breaks. Verified on the
// 2026-10-15 export: all 453,927 numbers, all 715 area codes, site stats and
// every month match what Supabase computed, except three codes Supabase
// itself had left stale.
//
// Callers:
//   refreshAll()     daily import (POST /api/admin/refresh) and initial load
//   refreshNumber()  community report form, moderation
//   refreshArea()    moderation
//
// phone is INTEGER, so "valid area code" (first digit 2-9) is
// phone >= 2000000000 and the area code is phone / 10000000.

// Rollups aggregate whole tables: seconds of database time, never on a render.
const REFRESH_DEADLINE_MS = 60_000;

type Scope = { where: string; params: unknown[] };
const ALL: Scope = { where: "", params: [] };
const phoneScope = (phone: number): Scope => ({ where: "AND phone = ?1", params: [phone] });
const codeScope = (code: number): Scope => ({ where: "AND phone / 10000000 = ?1", params: [code] });

const exec = (sql: string, params: unknown[] = []) => run(sql, params, REFRESH_DEADLINE_MS);

async function refreshNumbers(s: Scope) {
  await exec(
    `INSERT INTO numbers (phone, comm_total, comm_spam, comm_last)
     SELECT phone, count(*), sum(is_spam), max(created_at)
     FROM reports WHERE hidden = 0 ${s.where} GROUP BY phone
     ON CONFLICT (phone) DO UPDATE SET
       comm_total = excluded.comm_total,
       comm_spam  = excluded.comm_spam,
       comm_last  = excluded.comm_last`,
    s.params
  );
  await exec(
    `UPDATE numbers SET comm_total = 0, comm_spam = 0, comm_last = NULL, comm_top_type = NULL
     WHERE comm_total > 0 ${s.where}
       AND phone NOT IN (SELECT phone FROM reports WHERE hidden = 0 ${s.where})`,
    s.params
  );
  // Modal type with the old lookupPhone() tie-break: it sorted the number's
  // types (newest report first) by frequency with a stable sort and took the
  // last element — among the most frequent types, the one whose oldest report
  // is oldest.
  await exec(
    `WITH t AS (
       SELECT phone, type, count(*) AS n, min(created_at) AS first_seen
       FROM reports WHERE hidden = 0 AND type IS NOT NULL ${s.where}
       GROUP BY phone, type
     ),
     ranked AS (
       SELECT phone, type,
              row_number() OVER (PARTITION BY phone ORDER BY n DESC, first_seen ASC) AS rn
       FROM t
     )
     UPDATE numbers SET comm_top_type = ranked.type
     FROM ranked WHERE ranked.phone = numbers.phone AND ranked.rn = 1`,
    s.params
  );
  await exec(
    `UPDATE numbers SET comm_top_type = NULL
     WHERE comm_top_type IS NOT NULL ${s.where}
       AND phone NOT IN (SELECT phone FROM reports WHERE hidden = 0 AND type IS NOT NULL ${s.where})`,
    s.params
  );
  // Sitemap flag: reported more than once (get_indexable_numbers). Verified
  // organizations are added by the sitemap query itself.
  await exec(
    `UPDATE numbers SET indexable = CASE WHEN comm_total >= 2 AND phone >= 2000000000 THEN 1 ELSE 0 END
     WHERE 1 = 1 ${s.where}`,
    s.params
  );
}

async function refreshAreaSummaries(s: Scope) {
  await exec(
    s.where ? "DELETE FROM area_summaries WHERE code = ?1" : "DELETE FROM area_summaries",
    s.params
  );
  await exec(
    `WITH v AS (
       SELECT id, phone, phone / 10000000 AS code, type, created_at
       FROM reports WHERE hidden = 0 AND phone >= 2000000000 ${s.where}
     ),
     counted AS (
       SELECT phone, code, count(*) AS report_count, max(created_at) AS last_seen
       FROM v GROUP BY phone
     ),
     tally AS (
       SELECT phone, type, count(*) AS n, max(created_at) AS ls
       FROM v WHERE type IS NOT NULL GROUP BY phone, type
     ),
     modal AS (
       SELECT phone, type FROM (
         SELECT phone, type,
                row_number() OVER (PARTITION BY phone ORDER BY n DESC, ls DESC, type) AS rn
         FROM tally
       ) WHERE rn = 1
     ),
     per AS (
       SELECT c.phone, c.code, c.report_count, c.last_seen, m.type AS mct
       FROM counted c LEFT JOIN modal m USING (phone)
     ),
     buckets AS (
       SELECT code, coalesce(mct, 'Other') AS type, count(*) AS n FROM per GROUP BY 1, 2
     ),
     top AS (
       SELECT * FROM (
         SELECT per.*, row_number() OVER (
           PARTITION BY code ORDER BY report_count DESC, last_seen DESC, phone) AS rk
         FROM per
       ) WHERE rk <= 100
     ),
     topc AS (
       SELECT top.*, (
         SELECT r.comment FROM reports r
         WHERE r.phone = top.phone AND r.comment IS NOT NULL AND r.hidden = 0
         ORDER BY r.created_at DESC, r.id DESC LIMIT 1
       ) AS latest_comment
       FROM top
     ),
     codes AS (
       SELECT code, count(*) AS number_count, sum(report_count) AS report_total
       FROM per GROUP BY code
     )
     INSERT INTO area_summaries (code, payload, refreshed_at)
     SELECT c.code, json_object(
       'number_count', c.number_count,
       'report_total', c.report_total,
       'top_type', (SELECT type FROM buckets b WHERE b.code = c.code ORDER BY n DESC, type LIMIT 1),
       'type_counts', (SELECT json_group_object(type, n) FROM buckets b WHERE b.code = c.code),
       'top_numbers', (
         SELECT json_group_array(json(json_object(
           'phone_number', printf('%d', t.phone),
           'report_count', t.report_count,
           'most_common_type', t.mct,
           'latest_comment', t.latest_comment)) ORDER BY t.rk)
         FROM topc t WHERE t.code = c.code)
     ), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
     FROM codes c`,
    s.params
  );
}

// get_site_stats: the "flat" payload the homepage normalizes. Distinct numbers
// overall, per type and per area code, unfiltered by area code as before (the
// app drops implausible codes).
async function refreshSiteStats() {
  await exec(
    `INSERT INTO site_stats (id, payload, refreshed_at)
     SELECT 1, json_object(
       'total',        count(DISTINCT phone),
       'scam',         count(DISTINCT CASE WHEN type = 'Scam' THEN phone END),
       'telemarketer', count(DISTINCT CASE WHEN type = 'Telemarketer' THEN phone END),
       'robocall',     count(DISTINCT CASE WHEN type = 'Robocall' THEN phone END),
       'debt',         count(DISTINCT CASE WHEN type = 'Debt Collector' THEN phone END),
       'area_counts',  (
         SELECT json_group_object(printf('%03d', code), cnt) FROM (
           SELECT phone / 10000000 AS code, count(DISTINCT phone) AS cnt
           FROM reports WHERE hidden = 0 GROUP BY 1)
       )
     ), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
     FROM reports WHERE hidden = 0
     ON CONFLICT (id) DO UPDATE SET payload = excluded.payload, refreshed_at = excluded.refreshed_at`
  );
}

// compute_monthly_report for every month with data. Months are UTC; created_at
// is stored as UTC "YYYY-MM-DDTHH:MM:SS[.ffffff]".
async function refreshMonthlyReports() {
  await exec("DELETE FROM monthly_reports");
  await exec(
    `WITH valid AS (
       SELECT phone, type, created_at, substr(created_at, 1, 7) AS ym
       FROM reports WHERE hidden = 0 AND phone >= 2000000000
     ),
     months AS (SELECT DISTINCT ym FROM valid),
     total AS (SELECT count(DISTINCT phone) AS n FROM valid),
     first_seen AS (SELECT phone, min(ym) AS ym FROM valid GROUP BY phone),
     per_number AS (SELECT ym, phone, count(*) AS n FROM valid GROUP BY ym, phone),
     per_number_type AS (
       SELECT ym, phone, type, count(*) AS n FROM valid WHERE type IS NOT NULL GROUP BY 1, 2, 3
     ),
     -- Postgres mode(): most frequent value; ties go to the first in sort order.
     modal AS (
       SELECT ym, phone, type FROM (
         SELECT ym, phone, type,
                row_number() OVER (PARTITION BY ym, phone ORDER BY n DESC, type) AS rn
         FROM per_number_type
       ) WHERE rn = 1
     ),
     top AS (
       SELECT * FROM (
         SELECT p.ym, p.phone, p.n, m.type,
                row_number() OVER (PARTITION BY p.ym ORDER BY p.n DESC, p.phone) AS rk
         FROM per_number p LEFT JOIN modal m ON m.ym = p.ym AND m.phone = p.phone
       ) WHERE rk <= 10
     ),
     prev AS (
       SELECT strftime('%Y-%m', ym || '-01', '+1 month') AS ym, count(*) AS n
       FROM per_number GROUP BY ym
     )
     INSERT INTO monthly_reports (ym, payload, refreshed_at)
     SELECT m.ym, json_object(
       'ym', m.ym,
       'total_numbers_all_time', (SELECT n FROM total),
       'month_numbers',  (SELECT count(*) FROM per_number p WHERE p.ym = m.ym),
       'month_reports',  (SELECT count(*) FROM valid v WHERE v.ym = m.ym),
       'new_this_month', (SELECT count(*) FROM first_seen f WHERE f.ym = m.ym),
       'prev_month_numbers', coalesce((SELECT n FROM prev WHERE prev.ym = m.ym), 0),
       'type_counts', (
         SELECT json_group_object(type, n) FROM (
           SELECT type, count(*) AS n FROM valid v
           WHERE v.ym = m.ym AND type IS NOT NULL GROUP BY type)),
       'area_code_counts', (
         SELECT json_group_object(printf('%d', code), n) FROM (
           SELECT phone / 10000000 AS code, count(*) AS n
           FROM per_number p WHERE p.ym = m.ym GROUP BY 1)),
       'top_numbers', (
         SELECT json_group_array(json(json_object(
           'phone_number', printf('%d', t.phone), 'count', t.n, 'type', t.type)) ORDER BY t.rk)
         FROM top t WHERE t.ym = m.ym)
     ), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
     FROM months m`
  );
}

export async function refreshAll(): Promise<{ ms: number }> {
  const t0 = Date.now();
  await refreshNumbers(ALL);
  await refreshAreaSummaries(ALL);
  await refreshSiteStats();
  await refreshMonthlyReports();
  return { ms: Date.now() - t0 };
}

// One number's counters: reads that number's reports only.
export async function refreshNumber(phone: number): Promise<void> {
  await refreshNumbers(phoneScope(phone));
}

// One area code's summary plus the site-wide rollups it feeds into. Used by
// moderation, so a hidden report stops counting immediately.
export async function refreshArea(code: number): Promise<void> {
  await refreshAreaSummaries(codeScope(code));
  await refreshSiteStats();
  await refreshMonthlyReports();
}
