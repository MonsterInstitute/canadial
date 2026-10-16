import "server-only";
import { allSlow, batch, run } from "./d1";
import { HUBS } from "./hubs";
import { PROVINCE_PAGES } from "./provinces";

// Everything pages read by primary key instead of computing at render time:
//   numbers.c_*        community counters per number (reports, not FTC rows);
//                      comm_total mirrors c_total for the numbers_by_block index
//   numbers.listed     sitemap flag
//   area_summaries2    one row per area code
//   site_stats2        one row
//   monthly_reports2   one row per month
// (The *2 tables and c_* columns replace area_summaries / site_stats /
// monthly_reports / comm_*, which the previous pages read; see migration 0004.)
//   hub_numbers/stats  top numbers per scam-type hub
//
// Sources: the FTC aggregates (numbers.ftc_*, ftc_monthly, ftc_subjects) and
// community reports. "Community reports" are `reports` rows that are not the
// old one-row-per-number FTC imports (source 'ftc_dnc'); those are superseded by
// the aggregates and deleted at the Phase 4 release, and excluding them here
// means the rollups are identical before and after that deletion.
//
// Cost rules (AGENTS.md): every write only touches rows whose value changes
// (D1 bills each touched row, and numbers has ~7.3M rows); large scans happen
// here, once a day, never on a render.

const DEADLINE_MS = 60_000;
const COMMUNITY = "hidden = 0 AND source IS NOT 'ftc_dnc'";
// Monthly reports start with the first full month the FTC archive covers.
const FIRST_REPORT_MONTH = 202206;

const totals = { rowsRead: 0, rowsWritten: 0 };
async function exec(sql: string, params: unknown[] = []) {
  const r = await run(sql, params, DEADLINE_MS);
  totals.rowsRead += r.rowsRead;
  totals.rowsWritten += r.rowsWritten;
  return r;
}
async function read<T>(sql: string, params: unknown[] = []) {
  const r = await allSlow<T>(sql, params, DEADLINE_MS);
  totals.rowsRead += r.rowsRead;
  return r.results;
}

// FTC subject -> the site's caller types. Subjects are the FTC's own complaint
// categories; the mapping follows the classifier the old importer used.
export const SUBJECT_TYPE: Record<string, string> = {
  "Calls pretending to be government, businesses, or family and friends": "Scam",
  "Lotteries, prizes  & sweepstakes": "Scam",
  "Computer  & technical support": "Scam",
  "Work from home  & other ways to make money": "Scam",
  "Reducing your debt (credit cards, mortgage, student loans)": "Debt Collector",
  "Debt collection": "Debt Collector",
  "Medical  & prescriptions": "Telemarketer",
  "Energy, solar,  & utilities": "Telemarketer",
  "Warranties  & protection plans": "Telemarketer",
  "Home improvement  & cleaning": "Telemarketer",
  "Vacation  & timeshares": "Telemarketer",
  "Home security  & alarms": "Telemarketer",
  "Charities": "Telemarketer",
};
const typeOfSubject = (name: string) => SUBJECT_TYPE[name] ?? "Other";

async function subjectNames(): Promise<Map<number, string>> {
  const rows = await read<{ id: number; name: string }>("SELECT id, name FROM ftc_subject_names");
  return new Map(rows.map((r) => [r.id, r.name]));
}

type Scope = { where: string; params: unknown[] };
const ALL: Scope = { where: "", params: [] };
const phoneScope = (phone: number): Scope => ({ where: "AND phone = ?1", params: [phone] });

async function refreshCommunity(s: Scope) {
  await exec(
    `INSERT INTO numbers (phone, c_total, comm_total, c_spam, c_last, c_types)
     SELECT phone, count(*), count(*), sum(is_spam), max(created_at),
            (SELECT json_group_object(type, n) FROM (
               SELECT coalesce(r2.type, 'Other') AS type, count(*) AS n FROM reports r2
               WHERE r2.phone = r.phone AND r2.${COMMUNITY} GROUP BY 1))
     FROM reports r WHERE ${COMMUNITY} ${s.where} GROUP BY phone
     ON CONFLICT (phone) DO UPDATE SET
       c_total = excluded.c_total, comm_total = excluded.c_total, c_spam = excluded.c_spam,
       c_last = excluded.c_last, c_types = excluded.c_types
     WHERE numbers.c_total IS NOT excluded.c_total
        OR numbers.comm_total IS NOT excluded.c_total
        OR numbers.c_spam  IS NOT excluded.c_spam
        OR numbers.c_last  IS NOT excluded.c_last
        OR numbers.c_types IS NOT excluded.c_types`,
    s.params
  );
  // Numbers that no longer have any community report (moderation, or the old
  // FTC rows being excluded) drop back to zero.
  await exec(
    `UPDATE numbers SET c_total = 0, comm_total = 0, c_spam = 0, c_last = NULL, c_top_type = NULL, c_types = NULL
     WHERE (c_total > 0 OR comm_total > 0) ${s.where}
       AND phone NOT IN (SELECT phone FROM reports WHERE ${COMMUNITY} ${s.where})`,
    s.params
  );
  // Modal community type (same tie-break as before: among the most frequent,
  // the one whose oldest report is oldest).
  await exec(
    `WITH t AS (
       SELECT phone, type, count(*) AS n, min(created_at) AS first_seen
       FROM reports WHERE ${COMMUNITY} AND type IS NOT NULL ${s.where} GROUP BY phone, type
     ), ranked AS (
       SELECT phone, type, row_number() OVER (PARTITION BY phone ORDER BY n DESC, first_seen ASC) AS rn FROM t
     )
     UPDATE numbers SET c_top_type = ranked.type
     FROM ranked WHERE ranked.phone = numbers.phone AND ranked.rn = 1
       AND numbers.c_top_type IS NOT ranked.type`,
    s.params
  );
  // Sitemap flag (interim, until Phase 5 shards the sitemap): numbers with at
  // least 10 FTC complaints, 2 community reports, or a verified organization
  // (added by the sitemap query itself). ~26k URLs, one sitemap file.
  await exec(
    `UPDATE numbers SET listed = CASE
       WHEN phone >= 2000000000 AND (ftc_total >= 10 OR c_total >= 2) THEN 1 ELSE 0 END
     WHERE listed IS NOT (CASE
       WHEN phone >= 2000000000 AND (ftc_total >= 10 OR c_total >= 2) THEN 1 ELSE 0 END) ${s.where}`,
    s.params
  );
}

type AreaPayload = {
  number_count: number;
  report_total: number;
  top_type: string | null;
  type_counts: Record<string, number>;
  top_numbers: { phone_number: string; report_count: number; most_common_type: string | null; latest_comment: string | null }[];
};

// One area code's summary from a primary-key range of numbers (~10k rows on
// average) and the matching range of ftc_subjects.
async function computeArea(code: number, names: Map<number, string>): Promise<AreaPayload | null> {
  const lo = code * 10_000_000;
  const hi = lo + 9_999_999;
  const [agg] = await read<{ numbers: number; complaints: number }>(
    `SELECT count(*) AS numbers, coalesce(sum(ftc_total + c_total), 0) AS complaints
     FROM numbers WHERE phone BETWEEN ?1 AND ?2 AND ftc_total + c_total > 0`,
    [lo, hi]
  );
  if (!agg || agg.numbers === 0) return null;

  const typeCounts: Record<string, number> = {};
  const add = (t: string, n: number) => (typeCounts[t] = (typeCounts[t] ?? 0) + n);
  for (const r of await read<{ subject: number; n: number }>(
    "SELECT subject, sum(n) AS n FROM ftc_subjects WHERE phone BETWEEN ?1 AND ?2 GROUP BY subject",
    [lo, hi]
  )) add(typeOfSubject(names.get(r.subject) ?? ""), r.n);
  for (const r of await read<{ type: string | null; n: number }>(
    `SELECT type, count(*) AS n FROM reports WHERE phone BETWEEN ?1 AND ?2 AND ${COMMUNITY} GROUP BY type`,
    [lo, hi]
  )) add(r.type ?? "Other", r.n);

  const top = await read<{ phone: number; total: number; c_top_type: string | null; ftc_top: number | null; latest_comment: string | null }>(
    `SELECT n.phone, n.ftc_total + n.c_total AS total, n.c_top_type,
            (SELECT subject FROM ftc_subjects s WHERE s.phone = n.phone ORDER BY s.n DESC, s.subject LIMIT 1) AS ftc_top,
            (SELECT r.comment FROM reports r WHERE r.phone = n.phone AND r.comment IS NOT NULL AND r.${COMMUNITY}
              ORDER BY r.created_at DESC, r.id DESC LIMIT 1) AS latest_comment
     FROM numbers n WHERE n.phone BETWEEN ?1 AND ?2 AND n.ftc_total + n.c_total > 0
     ORDER BY total DESC, n.phone LIMIT 100`,
    [lo, hi]
  );
  const topType = Object.entries(typeCounts).filter(([t]) => t !== "Other").sort((a, b) => b[1] - a[1])[0]?.[0]
    ?? Object.keys(typeCounts)[0] ?? null;
  return {
    number_count: agg.numbers,
    report_total: agg.complaints,
    top_type: topType,
    type_counts: typeCounts,
    top_numbers: top.map((r) => ({
      phone_number: String(r.phone),
      report_count: r.total,
      most_common_type: r.c_top_type ?? (r.ftc_top != null ? typeOfSubject(names.get(r.ftc_top) ?? "") : null),
      latest_comment: r.latest_comment,
    })),
  };
}

async function writeIfChanged(table: string, keyCol: string, key: string | number, payload: unknown) {
  const json = JSON.stringify(payload);
  await exec(
    `INSERT INTO ${table} (${keyCol}, payload, refreshed_at) VALUES (?1, ?2, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
     ON CONFLICT (${keyCol}) DO UPDATE SET payload = excluded.payload, refreshed_at = excluded.refreshed_at
     WHERE ${table}.payload IS NOT excluded.payload`,
    [key, json]
  );
}

async function refreshAreas(codes: number[] | null, names: Map<number, string>) {
  const list =
    codes ??
    (await read<{ code: number }>(
      "SELECT DISTINCT phone / 10000000 AS code FROM numbers WHERE phone >= 2000000000"
    )).map((r) => r.code);
  const payloads: Record<string, number> = {};
  for (const code of list) {
    const p = await computeArea(code, names);
    if (p) {
      await writeIfChanged("area_summaries2", "code", code, p);
      payloads[String(code).padStart(3, "0")] = p.number_count;
    } else {
      await exec("DELETE FROM area_summaries2 WHERE code = ?1", [code]);
    }
  }
  return payloads;
}

async function refreshSiteStats(names: Map<number, string>) {
  const [agg] = await read<{ numbers: number; complaints: number }>(
    `SELECT count(*) AS numbers, sum(ftc_total + c_total) AS complaints FROM numbers WHERE ftc_total + c_total > 0`
  );
  const typeCounts: Record<string, number> = {};
  const add = (t: string, n: number) => (typeCounts[t] = (typeCounts[t] ?? 0) + n);
  for (const r of await read<{ subject: number; n: number }>("SELECT subject, sum(n) AS n FROM ftc_subjects GROUP BY subject"))
    add(typeOfSubject(names.get(r.subject) ?? ""), r.n);
  for (const r of await read<{ type: string | null; n: number }>(`SELECT type, count(*) AS n FROM reports WHERE ${COMMUNITY} GROUP BY type`))
    add(r.type ?? "Other", r.n);
  const areaCodes: Record<string, number> = {};
  for (const r of await read<{ code: number; n: number }>(
    "SELECT code, json_extract(payload, '$.number_count') AS n FROM area_summaries2"
  )) areaCodes[String(r.code).padStart(3, "0")] = r.n;
  await writeIfChanged("site_stats2", "id", 1, {
    total_numbers: agg.numbers,
    total_reports: agg.complaints,
    type_counts: typeCounts,
    area_codes: areaCodes,
  });
}

// Monthly reports cover numbers with Canadian area codes: the pages are
// "Canadian spam call reports" (in 11 languages) and say numbers were
// reported "in Canada" and which province was most targeted, which is only
// true of Canadian numbers. Counts are FTC complaints by call month plus
// community reports. Built from a few GROUP BYs, assembled here; only months
// whose payload changed are written.
const CANADIAN_CODES = PROVINCE_PAGES.flatMap((p) => p.codes).map(Number).sort((a, b) => a - b);
const IS_CANADIAN = `phone / 10000000 IN (${CANADIAN_CODES.join(",")})`;

async function refreshMonthly() {
  const ym = (s: string) => Number(s.slice(0, 4) + s.slice(5, 7));
  const months = new Map<number, {
    numbers: number; complaints: number; newNumbers: number;
    codes: Record<string, number>; top: { phone_number: string; count: number; type: string | null }[];
    types: Record<string, number>;
  }>();
  const m = (k: number) => {
    let v = months.get(k);
    if (!v) months.set(k, (v = { numbers: 0, complaints: 0, newNumbers: 0, codes: {}, top: [], types: {} }));
    return v;
  };
  for (const r of await read<{ ym: number; numbers: number; complaints: number }>(
    `SELECT ym, count(*) AS numbers, sum(n) AS complaints FROM ftc_monthly WHERE ym >= ?1 AND ${IS_CANADIAN} GROUP BY ym`, [FIRST_REPORT_MONTH]
  )) Object.assign(m(r.ym), { numbers: r.numbers, complaints: r.complaints });
  for (const r of await read<{ ym: number; n: number }>(
    `SELECT ftc_first / 100 AS ym, count(*) AS n FROM numbers WHERE ftc_first / 100 >= ?1 AND ${IS_CANADIAN} GROUP BY 1`, [FIRST_REPORT_MONTH]
  )) m(r.ym).newNumbers = r.n;
  for (const r of await read<{ ym: number; code: number; n: number }>(
    `SELECT ym, phone / 10000000 AS code, count(*) AS n FROM ftc_monthly WHERE ym >= ?1 AND ${IS_CANADIAN} GROUP BY 1, 2`, [FIRST_REPORT_MONTH]
  )) m(r.ym).codes[String(r.code).padStart(3, "0")] = r.n;
  // Busiest numbers per month: rows with 2+ complaints in a month (Canadian
  // numbers only, a small result).
  const busy = await read<{ ym: number; phone: number; n: number }>(
    `SELECT ym, phone, n FROM ftc_monthly WHERE ym >= ?1 AND n >= 2 AND ${IS_CANADIAN} ORDER BY ym, n DESC, phone`, [FIRST_REPORT_MONTH]
  );
  for (const r of busy) {
    const v = m(r.ym);
    if (v.top.length < 10) v.top.push({ phone_number: String(r.phone), count: r.n, type: null });
  }
  // Community reports by month and type (FTC aggregates have no per-month
  // subject split, so the monthly type breakdown covers community reports).
  for (const r of await read<{ month: string; type: string | null; n: number }>(
    `SELECT substr(created_at, 1, 7) AS month, coalesce(type, 'Other') AS type, count(*) AS n
     FROM reports WHERE ${COMMUNITY} AND ${IS_CANADIAN} GROUP BY 1, 2`
  )) {
    const k = ym(r.month);
    if (k >= FIRST_REPORT_MONTH) m(k).types[r.type!] = r.n;
  }
  const [{ total }] = await read<{ total: number }>(`SELECT count(*) AS total FROM numbers WHERE ftc_total + c_total > 0 AND ${IS_CANADIAN}`);
  const keys = [...months.keys()].sort();
  for (const k of keys) {
    const v = months.get(k)!;
    const prev = months.get(k % 100 === 1 ? k - 89 : k - 1);
    const key = `${Math.floor(k / 100)}-${String(k % 100).padStart(2, "0")}`;
    await writeIfChanged("monthly_reports2", "ym", key, {
      ym: key,
      total_numbers_all_time: total,
      month_numbers: v.numbers,
      month_reports: v.complaints,
      new_this_month: v.newNumbers,
      prev_month_numbers: prev?.numbers ?? 0,
      type_counts: v.types,
      area_code_counts: v.codes,
      top_numbers: v.top,
    });
  }
}

// Scam-type hubs: the busiest numbers per hub by complaints in the hub's FTC
// subjects. Only subject rows with 5+ complaints can rank, which keeps this one
// scan with a small result.
async function refreshHubs(names: Map<number, string>) {
  const idsByName = new Map([...names].map(([id, n]) => [n, id]));
  const subjectTotals = new Map(
    (await read<{ subject: number; numbers: number; complaints: number }>(
      "SELECT subject, count(*) AS numbers, sum(n) AS complaints FROM ftc_subjects GROUP BY subject"
    )).map((r) => [r.subject, r])
  );
  const rows = await read<{ subject: number; phone: number; n: number }>(
    "SELECT subject, phone, n FROM ftc_subjects WHERE n >= 5"
  );
  for (const hub of HUBS) {
    const ids = new Set(hub.subjects.map((s) => idsByName.get(s)).filter((x): x is number => x != null));
    const per = new Map<number, number>();
    for (const r of rows) if (ids.has(r.subject)) per.set(r.phone, (per.get(r.phone) ?? 0) + r.n);
    const top = [...per].sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, 100);
    const stats = [...ids].reduce(
      (acc, id) => ({ numbers: acc.numbers + (subjectTotals.get(id)?.numbers ?? 0), complaints: acc.complaints + (subjectTotals.get(id)?.complaints ?? 0) }),
      { numbers: 0, complaints: 0 }
    );
    await writeIfChanged("hub_stats", "hub", hub.slug, { ...stats, listed: top.length });
    const current = await read<{ rank: number; phone: number; n: number }>(
      "SELECT rank, phone, n FROM hub_numbers WHERE hub = ?1 ORDER BY rank", [hub.slug]
    );
    const same = current.length === top.length && current.every((c, i) => c.phone === top[i][0] && c.n === top[i][1]);
    if (!same) {
      await exec("DELETE FROM hub_numbers WHERE hub = ?1", [hub.slug]);
      for (let i = 0; i < top.length; i += 50) {
        await batch(top.slice(i, i + 50).map(([phone, n], j) => ({
          sql: "INSERT INTO hub_numbers (hub, rank, phone, n) VALUES (?, ?, ?, ?)",
          params: [hub.slug, i + j + 1, phone, n],
        })));
        totals.rowsWritten += Math.min(50, top.length - i);
      }
    }
  }
}

export const REFRESH_PARTS = ["community", "areas", "stats", "monthly", "hubs"] as const;
export type RefreshPart = (typeof REFRESH_PARTS)[number];

// The whole refresh is 2-3 minutes of database work. Callers over HTTP run it
// one part at a time (each well under a minute), in this order: a single long
// request was fragile — one dropped connection or slow moment lost the run.
export async function refreshAll(
  parts: readonly RefreshPart[] = REFRESH_PARTS
): Promise<{ ms: number; rowsRead: number; rowsWritten: number; parts: readonly RefreshPart[] }> {
  const t0 = Date.now();
  totals.rowsRead = 0;
  totals.rowsWritten = 0;
  const names = await subjectNames();
  for (const part of parts) {
    if (part === "community") await refreshCommunity(ALL);
    else if (part === "areas") await refreshAreas(null, names);
    else if (part === "stats") await refreshSiteStats(names);
    else if (part === "monthly") await refreshMonthly();
    else if (part === "hubs") await refreshHubs(names);
  }
  return { ms: Date.now() - t0, ...totals, parts };
}

// One number's community counters (report form, moderation).
export async function refreshNumber(phone: number): Promise<void> {
  await refreshCommunity(phoneScope(phone));
}

// One area code plus the site-wide rollups it feeds (moderation).
export async function refreshArea(code: number): Promise<void> {
  const names = await subjectNames();
  await refreshAreas([code], names);
  await refreshSiteStats(names);
  await refreshMonthly();
}
