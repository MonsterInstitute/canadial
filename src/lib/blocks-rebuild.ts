import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { csvFields, zipLines } from "./zip-stream";

// Monthly refresh of the NPA-NXX block tables (number_blocks, number_blocks_x)
// from the CNAC and NANPA files, entirely inside the Worker: GitHub only calls
// the admin endpoints with ADMIN_TOKEN (no database credentials).
//
//   fetchBlockFiles()   downloads the four archives into R2 (blocks/raw/<date>/)
//   rebuildBlocks(date) builds number_blocks_new / number_blocks_x_new from them,
//                       checks the row counts, then swaps them in atomically
//
// The parsing rules are scripts/blocks_build.py's, line for line (that script
// built the first load; keep them in step). See it for what a block row means.

export const BLOCK_FILES = [
  { name: "COCodeStatus_ALL.zip", url: "https://www.cnac.ca/data/COCodeStatus_ALL.zip" },
  { name: "CoCodeAssignment_Utilized_AllStates_Public.zip", url: "https://reports.nanpa.com/public/CoCodeAssignment_Utilized_AllStates_Public.zip" },
  { name: "ThousandsBlockAssignment_All_Augmented.zip", url: "https://reports.nanpa.com/public/ThousandsBlockAssignment_All_Augmented.zip" },
  { name: "COBlockStatus_ALL.zip", url: "https://www.cnac.ca/data/COBlockStatus_ALL.zip" },
];

// A rebuild that comes out smaller than this keeps the current tables: a
// truncated or changed source file must not wipe the data.
const MIN_ROWS = { ca: 40_000, us: 190_000, x: 600_000 };
const ROWS_PER_STATEMENT = 400;
const STATEMENTS_PER_BATCH = 25;

async function env() {
  const { env } = await getCloudflareContext({ async: true });
  return env as { DB: D1Database; FTC_DATA: R2Bucket };
}

export async function fetchBlockFiles(date: string) {
  const { FTC_DATA: bucket } = await env();
  const stored: { name: string; bytes: number; sha256: string }[] = [];
  for (const f of BLOCK_FILES) {
    const res = await fetch(f.url, { headers: { "User-Agent": "canadial-data/1.0 (+https://www.canadial.com)" }, signal: AbortSignal.timeout(120_000) });
    const buf = await res.arrayBuffer();
    const magic = new Uint8Array(buf.slice(0, 4));
    if (!res.ok || magic[0] !== 0x50 || magic[1] !== 0x4b) throw new Error(`${f.name}: HTTP ${res.status}, not a ZIP`);
    const digest = [...new Uint8Array(await crypto.subtle.digest("SHA-256", buf))].map((b) => b.toString(16).padStart(2, "0")).join("");
    await bucket.put(`blocks/raw/${date}/${f.name}`, buf, {
      httpMetadata: { contentType: "application/zip" },
      customMetadata: { sha256: digest, source_url: f.url, fetched_at: new Date().toISOString() },
    });
    stored.push({ name: f.name, bytes: buf.byteLength, sha256: digest });
  }
  return stored;
}

const sql = (v: string | number | null) => (v === null ? "NULL" : typeof v === "number" ? String(v) : `'${v.replace(/'/g, "''")}'`);
const orNull = (s: string | undefined) => (s && s.trim() ? s.trim() : null);

export async function rebuildBlocks(date: string) {
  const { DB: db, FTC_DATA: bucket } = await env();
  const key = (name: string) => `blocks/raw/${date}/${name}`;
  const counts = { ca_assigned: 0, ca_unassigned: 0, us_assigned: 0, xb_assigned_other_carrier: 0, xb_same_as_code: 0, xb_available: 0, statements: 0 };

  await db.batch([
    db.prepare("DROP TABLE IF EXISTS number_blocks_new"),
    db.prepare("DROP TABLE IF EXISTS number_blocks_x_new"),
    db.prepare(`CREATE TABLE number_blocks_new (
      npanxx INTEGER PRIMARY KEY, country TEXT NOT NULL, region TEXT, rate_center TEXT, carrier TEXT, ocn TEXT,
      source TEXT NOT NULL, as_of TEXT NOT NULL, status TEXT, pooled INTEGER NOT NULL DEFAULT 0)`),
    db.prepare("CREATE TABLE number_blocks_x_new (npanxxx INTEGER PRIMARY KEY, status TEXT NOT NULL, carrier TEXT, ocn TEXT)"),
  ]);

  let pending: string[] = [];
  let rows: string[] = [];
  const flushRows = (table: string, cols: string) => {
    if (rows.length) pending.push(`INSERT INTO ${table} (${cols}) VALUES ${rows.join(",")}`);
    rows = [];
  };
  const flushBatch = async (force = false) => {
    if (pending.length >= STATEMENTS_PER_BATCH || (force && pending.length)) {
      await db.batch(pending.map((s) => db.prepare(s)));
      counts.statements += pending.length;
      pending = [];
    }
  };
  const BLOCK_COLS = "npanxx, country, region, rate_center, carrier, ocn, status, pooled, source, as_of";
  const X_COLS = "npanxxx, status, carrier, ocn";
  const add = async (table: string, cols: string, values: (string | number | null)[]) => {
    rows.push(`(${values.map(sql).join(",")})`);
    if (rows.length >= ROWS_PER_STATEMENT) {
      flushRows(table, cols);
      await flushBatch();
    }
  };

  // Code holder OCN per NPA-NXX, to drop thousands-blocks that add nothing.
  const codeOcn = new Map<number, string | null>();

  // Canada: every CO code with its CNAC status.
  let n = 0;
  for await (const line of zipLines(bucket, key("COCodeStatus_ALL.zip"))) {
    if (n++ < 2) continue; // header, then a row holding only the file date
    const r = csvFields(line);
    if (r.length < 8 || !/^\d+$/.test(r[0].trim()) || !/^\d+$/.test(r[1].trim())) continue;
    const npanxx = Number(r[0]) * 1000 + Number(r[1]);
    const assigned = r[2].trim() === "In Service";
    if (assigned) counts.ca_assigned++;
    else counts.ca_unassigned++;
    codeOcn.set(npanxx, assigned ? orNull(r[7]) : null);
    await add("number_blocks_new", BLOCK_COLS, [npanxx, "CA", orNull(r[5]), orNull(r[4]), assigned ? orNull(r[6]) : null, assigned ? orNull(r[7]) : null, assigned ? "assigned" : "unassigned", r[3].trim() === "Y" ? 1 : 0, "CNAC", date]);
  }

  // US: every assigned CO code.
  n = 0;
  let hdr: string[] = [];
  for await (const line of zipLines(bucket, key("CoCodeAssignment_Utilized_AllStates_Public.zip"))) {
    const r = line.split("\t").map((c) => c.trim());
    if (n++ === 0) {
      hdr = r;
      continue;
    }
    const i = (h: string) => hdr.indexOf(h);
    if (r.length < hdr.length - 1 || !r[i("NPA-NXX")]?.includes("-")) continue;
    const [npa, nxx] = r[i("NPA-NXX")].split("-");
    const npanxx = Number(npa) * 1000 + Number(nxx);
    if (codeOcn.has(npanxx)) continue; // an NPA in both files would be a data error
    counts.us_assigned++;
    codeOcn.set(npanxx, orNull(r[i("OCN")]));
    await add("number_blocks_new", BLOCK_COLS, [npanxx, "US", orNull(r[i("State")]), orNull(r[i("RateCenter")]), orNull(r[i("Company")].replace(/^"|"$/g, "")), orNull(r[i("OCN")]), "assigned", r[i("Pooled Code")] === "Y" ? 1 : 0, "NANPA", date]);
  }
  flushRows("number_blocks_new", BLOCK_COLS);

  // US thousands-blocks: kept when the carrier differs from the code holder,
  // or the block isn't assigned to anyone.
  n = 0;
  for await (const line of zipLines(bucket, key("ThousandsBlockAssignment_All_Augmented.zip"))) {
    const r = csvFields(line);
    if (n++ === 0) {
      hdr = r;
      continue;
    }
    const i = (h: string) => hdr.indexOf(h);
    const npa = Number(r[i("NPA")]), nxx = Number(r[i("NXX")]), x = Number(r[i("X")]);
    if (!Number.isInteger(npa) || !Number.isInteger(nxx) || !Number.isInteger(x) || r[i("X")] === "") continue;
    const npanxx = npa * 1000 + nxx;
    const st = (r[i("STATUS")] ?? "").trim();
    if (st === "AS" || st === "RT") {
      const ocn = orNull(r[i("OCN")]);
      if (codeOcn.has(npanxx) && ocn === codeOcn.get(npanxx)) {
        counts.xb_same_as_code++;
        continue;
      }
      counts.xb_assigned_other_carrier++;
      await add("number_blocks_x_new", X_COLS, [npanxx * 10 + x, "assigned", orNull(r[i("Assigned To")]), ocn]);
    } else {
      counts.xb_available++;
      await add("number_blocks_x_new", X_COLS, [npanxx * 10 + x, "available", null, null]);
    }
  }
  flushRows("number_blocks_x_new", X_COLS);
  await flushBatch(true);

  const xTotal = counts.xb_assigned_other_carrier + counts.xb_available;
  const ok = counts.ca_assigned + counts.ca_unassigned >= MIN_ROWS.ca && counts.us_assigned >= MIN_ROWS.us && xTotal >= MIN_ROWS.x;
  if (!ok) {
    await db.batch([db.prepare("DROP TABLE number_blocks_new"), db.prepare("DROP TABLE number_blocks_x_new")]);
    return { swapped: false, reason: "row counts below the safety minimum; current tables kept", counts };
  }
  // One transaction: readers see the old tables or the new ones, never a mix.
  await db.batch([
    db.prepare("DROP TABLE number_blocks"),
    db.prepare("ALTER TABLE number_blocks_new RENAME TO number_blocks"),
    db.prepare("DROP TABLE number_blocks_x"),
    db.prepare("ALTER TABLE number_blocks_x_new RENAME TO number_blocks_x"),
  ]);
  return { swapped: true, counts };
}
