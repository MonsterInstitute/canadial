import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// Apply one FTC daily file (already in R2, see /api/admin/ftc/fetch) to the
// per-number aggregates: numbers.ftc_*, ftc_monthly, ftc_states, ftc_subjects.
//
// Counts are added, never replaced, and every day is applied exactly once:
// the aggregates and the day's ftc_ingest_log row go in one D1 batch (a
// transaction), and a day already in the log is refused. Re-running the daily
// job is therefore harmless, and a failed run leaves nothing half-applied.
//
// The rules are the ones scripts/ftc_aggregate.py used for the backfill —
// keep the two in step:
//   * a complaint is one CSV row; a row identical to one in the same file or in
//     the previous DEDUPE_FILES stored files is a republished complaint and
//     counts once (the FTC repeats ~27k rows a year in the next day's file);
//   * phone: digits; 11 with a leading 1 drop it; then 10 digits, area code 2-9;
//   * dates are "YYYY-MM-DD hh:mm:ss" or, in some files, "M/D/YYYY h:mm";
//   * date: Violation_Date when it parses and falls in the 365 days up to the
//     file's date, else Created_Date;
//   * state: Consumer_State trimmed, empty not counted;
//   * subject: Subject trimmed, empty is "(not given)";
//   * robocall: Recorded_Message_Or_Robocall == "Y".

const HEADER = "Company_Phone_Number,Created_Date,Violation_Date,Consumer_City,Consumer_State,Consumer_Area_Code,Subject,Recorded_Message_Or_Robocall";
const NO_SUBJECT = "(not given)";
const DEDUPE_FILES = 7;
const MAX_CALL_AGE_DAYS = 365;
// How far back to look for the previous DEDUPE_FILES stored files; the FTC
// skips weekends and holidays, so 7 files span 9-11 calendar days.
const DEDUPE_SEARCH_DAYS = 21;
// Rows per INSERT. Values are inlined (integers, and strings escaped below)
// rather than bound: D1 allows 100 bound parameters per statement, which
// would turn a day into thousands of statements; this keeps it to dozens,
// each well under D1's 100 KB statement limit.
const ROWS_PER_STATEMENT = 1000;

export function rawKey(day: string) {
  return `ftc/raw/${day.slice(0, 4)}/DNC_Complaint_Numbers_${day}.csv`;
}

// RFC 4180 fields: commas and quotes inside quoted fields.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function phone(raw: string): number | null {
  let d = raw.replace(/\D/g, "");
  if (d.length === 11 && d[0] === "1") d = d.slice(1);
  return d.length === 10 && d[0] >= "2" ? Number(d) : null;
}

function yyyymmdd(s: string): number | null {
  let y: number, mo: number, d: number;
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  else {
    m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s);
    if (!m) return null;
    [mo, d, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  }
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 2000 || y > 2099) return null;
  return y * 10000 + mo * 100 + d;
}

function shiftDays(day: string, days: number): string {
  const t = Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)));
  return new Date(t + days * 86_400_000).toISOString().slice(0, 10);
}

// Row keys of the previous DEDUPE_FILES stored files, read from R2.
async function recentRowKeys(bucket: R2Bucket, day: string): Promise<Set<string>> {
  const keys = new Set<string>();
  let files = 0;
  for (let back = 1; back <= DEDUPE_SEARCH_DAYS && files < DEDUPE_FILES; back++) {
    const obj = await bucket.get(rawKey(shiftDays(day, -back)));
    if (!obj) continue;
    files++;
    const rows = parseCsv(await obj.text());
    for (let i = 1; i < rows.length; i++) if (rows[i].length === 8) keys.add(rows[i].join("\u001f"));
  }
  return keys;
}

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;

export type IngestResult =
  | { day: string; status: "applied"; records: number; complaints: number; numbers: number; statements: number }
  | { day: string; status: "already_applied" }
  | { day: string; status: "no_file" };

export async function ingestFtcDay(day: string): Promise<IngestResult> {
  const { env } = await getCloudflareContext({ async: true });
  const { DB: db, FTC_DATA: bucket } = env as { DB: D1Database; FTC_DATA: R2Bucket };

  if (await db.prepare("SELECT 1 FROM ftc_ingest_log WHERE day = ?").bind(day).first()) {
    return { day, status: "already_applied" };
  }
  const obj = await bucket.get(rawKey(day));
  if (!obj) return { day, status: "no_file" };
  const text = await obj.text();
  const sha256 = obj.customMetadata?.sha256 ?? "";

  const rows = parseCsv(text);
  if (rows[0]?.join(",") !== HEADER) throw new Error(`${day}: unexpected header`);
  const fileDay = Number(day.replace(/-/g, ""));
  const oldestCall = Number(shiftDays(day, -MAX_CALL_AGE_DAYS).replace(/-/g, ""));

  const recent = await recentRowKeys(bucket, day);
  const seen = new Set<string>();
  const total = new Map<number, number>();
  const robo = new Map<number, number>();
  const first = new Map<number, number>();
  const last = new Map<number, number>();
  const monthly = new Map<string, number>();
  const states = new Map<string, number>();
  const subjects = new Map<string, number>(); // key `${phone}\u001f${subjectName}`
  let records = 0;
  let complaints = 0;
  const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (r.length === 1 && r[0] === "") continue; // trailing newline
    records++;
    if (r.length !== 8) continue;
    const key = r.join("\u001f");
    if (seen.has(key) || recent.has(key)) continue;
    seen.add(key);
    const p = phone(r[0]);
    if (p === null) continue;
    let d = yyyymmdd(r[2]);
    if (d === null || d > fileDay || d < oldestCall) d = yyyymmdd(r[1]);
    if (d === null) continue;
    complaints++;
    total.set(p, (total.get(p) ?? 0) + 1);
    if (r[7].trim().toUpperCase() === "Y") robo.set(p, (robo.get(p) ?? 0) + 1);
    first.set(p, Math.min(first.get(p) ?? d, d));
    last.set(p, Math.max(last.get(p) ?? d, d));
    bump(monthly, `${p}\u001f${Math.floor(d / 100)}`);
    const st = r[4].trim();
    if (st) bump(states, `${p}\u001f${st}`);
    bump(subjects, `${p}\u001f${r[6].trim() || NO_SUBJECT}`);
  }

  // Subject names get small integer ids; new names are added first so the
  // ids exist when the batch below references them.
  const names = [...new Set([...subjects.keys()].map((k) => k.split("\u001f")[1]))];
  if (names.length) {
    await db.batch(names.map((n) => db.prepare("INSERT OR IGNORE INTO ftc_subject_names (id, name) VALUES ((SELECT coalesce(max(id), 0) + 1 FROM ftc_subject_names), ?)").bind(n)));
  }
  const ids = new Map(
    (await db.prepare("SELECT id, name FROM ftc_subject_names").all<{ id: number; name: string }>()).results.map(
      (r) => [r.name, r.id] as const
    )
  );

  const statements: string[] = [];
  const chunked = <T,>(items: T[], render: (rows: T[]) => string) => {
    for (let i = 0; i < items.length; i += ROWS_PER_STATEMENT) statements.push(render(items.slice(i, i + ROWS_PER_STATEMENT)));
  };
  chunked([...total.keys()], (ps) =>
    `INSERT INTO numbers (phone, ftc_total, ftc_robocall, ftc_first, ftc_last) VALUES ${ps
      .map((p) => `(${p},${total.get(p)},${robo.get(p) ?? 0},${first.get(p)},${last.get(p)})`)
      .join(",")}
     ON CONFLICT (phone) DO UPDATE SET
       ftc_total = ftc_total + excluded.ftc_total,
       ftc_robocall = ftc_robocall + excluded.ftc_robocall,
       ftc_first = min(coalesce(ftc_first, excluded.ftc_first), excluded.ftc_first),
       ftc_last = max(coalesce(ftc_last, excluded.ftc_last), excluded.ftc_last)`
  );
  chunked([...monthly.entries()], (es) =>
    `INSERT INTO ftc_monthly (phone, ym, n) VALUES ${es
      .map(([k, n]) => `(${k.split("\u001f").join(",")},${n})`)
      .join(",")} ON CONFLICT (phone, ym) DO UPDATE SET n = n + excluded.n`
  );
  chunked([...states.entries()], (es) =>
    `INSERT INTO ftc_states (phone, state, n) VALUES ${es
      .map(([k, n]) => {
        const [p, st] = k.split("\u001f");
        return `(${p},${q(st)},${n})`;
      })
      .join(",")} ON CONFLICT (phone, state) DO UPDATE SET n = n + excluded.n`
  );
  chunked([...subjects.entries()], (es) =>
    `INSERT INTO ftc_subjects (phone, subject, n) VALUES ${es
      .map(([k, n]) => {
        const [p, name] = k.split("\u001f");
        return `(${p},${ids.get(name)},${n})`;
      })
      .join(",")} ON CONFLICT (phone, subject) DO UPDATE SET n = n + excluded.n`
  );
  // The day's busiest numbers, for "Trending today" (100 rows a day).
  const busiest = [...total].sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, 100);
  if (busiest.length) {
    statements.push(
      `INSERT OR REPLACE INTO ftc_daily_top (day, rank, phone, n) VALUES ${busiest
        .map(([p, n], i) => `(${q(day)},${i + 1},${p},${n})`)
        .join(",")}`
    );
  }
  statements.push(
    `INSERT INTO ftc_ingest_log (day, records, valid, sha256, r2_key, applied_at)
     VALUES (${q(day)}, ${records}, ${complaints}, ${q(sha256)}, ${q(rawKey(day))}, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))`
  );

  // One transaction: all of the day or none of it. The log row's primary key
  // makes a concurrent second run fail instead of double-counting.
  await db.batch(statements.map((s) => db.prepare(s)));
  return { day, status: "applied", records, complaints, numbers: total.size, statements: statements.length };
}
