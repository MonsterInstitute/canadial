import "server-only";
import { batch } from "./d1";
import { normalizePhone } from "./phone";
import { subjectLabel } from "./hubs";

// Everything a number page shows, in one D1 round trip. Every read is bounded
// by a primary key or an index range with a small, fixed ceiling:
//   organizations / numbers / number_blocks / number_blocks_x   1 row each
//   ftc_monthly   one row per month with complaints (<= ~65)
//   ftc_states    top 6 (reads <= ~60, one per state)
//   ftc_subjects  <= 16 (one per FTC category)
//   reports       5 newest community reports
//   neighbours    5 off the numbers_by_block index
//   ftc_ingest_log max(day), one row
// None of these grows with the size of the database. Errors throw
// (src/lib/d1.ts): a failed read is never "no data".

const TOLL_FREE = new Set([800, 833, 844, 855, 866, 877, 888]);

export type Block = {
  country: "CA" | "US";
  region: string | null;
  // A proper place name: CNAC's exchange area for Canada; for the US, the
  // Census place whose name exactly matches NANPA's rate centre (null if none).
  city: string | null;
  // NANPA's raw rate centre when no reliable place name exists ("WARRENVL").
  // Shown labelled as a rate centre, never as a city or in titles.
  rateCentre: string | null;
  carrier: string | null;
  source: "CNAC" | "NANPA";
  asOf: string;
  // "assigned": the block belongs to a carrier. "unassigned": the exchange or
  // thousands-block is not assigned to any carrier, so no working line can
  // have this number and the caller ID was almost certainly spoofed.
  status: "assigned" | "unassigned";
};

export type CommunityReport = {
  id: string;
  type: string | null;
  comment: string | null;
  createdAt: string;
  source: string | null;
};

export type NumberData = {
  phone: string;
  org: { name: string | null; department: string | null; category: string | null; description: string | null; hours: string | null; tip: string | null; website: string | null } | null;
  ftc: {
    total: number;
    robocalls: number;
    first: string | null; // YYYY-MM-DD
    last: string | null;
    monthly: { ym: string; n: number }[]; // every month first..last, zeros filled
    states: { state: string; n: number }[];
    subjects: { label: string; raw: string; n: number }[];
  };
  community: {
    total: number;
    last: string | null;
    topType: string | null;
    types: Record<string, number>;
    recent: CommunityReport[];
  };
  block: Block | null;
  tollFree: boolean;
  neighbours: { phone: string; complaints: number }[];
  ftcDataThrough: string | null;
};

const ymd = (v: number | null) => (v ? `${String(v).slice(0, 4)}-${String(v).slice(4, 6)}-${String(v).slice(6, 8)}` : null);

// US carrier names come in legal form ("CELLCO PARTNERSHIP DBA VERIZON
// WIRELESS"); show the trade name after "DBA" where there is one, in the
// source's own spelling otherwise. Never invented.
export function carrierLabel(raw: string | null): string | null {
  if (!raw || /^MULTIPLE OCN/i.test(raw)) return null;
  const dba = raw.match(/\bD\/?B\/?A\b\s*(.+)$/i);
  let name = (dba ? dba[1] : raw).replace(/\s+/g, " ").trim();
  // NANPA appends the state to multi-state carriers ("... LLC - FL").
  name = name.replace(/\s+-\s+[A-Z]{2}$/, "");
  // NANPA writes names in capitals; Canadian (CNAC) names are already mixed case.
  return name === name.toUpperCase() ? displayCase(name) : name;
}

const KEEP_UPPER = new Set(["LLC", "LP", "LLP", "CLEC", "ILEC", "USA", "US", "AT&T", "MCI", "PCS", "GTE", "II", "III", "IV", "NE", "NW", "SE", "SW"]);
const KEEP_LOWER = new Set(["of", "and", "the", "for", "dba"]);
function displayCase(s: string): string {
  return s
    .split(" ")
    .map((w, i) => {
      const bare = w.replace(/[^A-Z&]/g, "");
      if (KEEP_UPPER.has(bare)) return w;
      const lower = w.toLowerCase();
      if (i > 0 && KEEP_LOWER.has(lower.replace(/[^a-z]/g, ""))) return lower;
      return lower.replace(/(^|[-/(])([a-z])/g, (_, p, c) => p + c.toUpperCase());
    })
    .join(" ");
}

export async function loadNumber(phone: string): Promise<NumberData> {
  const n = normalizePhone(phone);
  const key = Number(n);
  const npa = Math.floor(key / 10_000_000);
  const npanxx = Math.floor(key / 10_000);

  type Org = NonNullable<NumberData["org"]>;
  type Num = { ftc_total: number; ftc_robocall: number; ftc_first: number | null; ftc_last: number | null; c_total: number; c_last: string | null; c_top_type: string | null; c_types: string | null };
  type Blk = { country: "CA" | "US"; region: string | null; rate_center: string | null; place: string | null; carrier: string | null; source: "CNAC" | "NANPA"; as_of: string; status: string };
  type BlkX = { status: string; carrier: string | null };

  const [orgs, nums, monthly, states, subjects, reports, blocks, xblocks, neighbours, latest, npaRows] = await batch<
    [Org, Num, { ym: number; n: number }, { state: string; n: number }, { name: string; n: number }, { id: string; type: string | null; comment: string | null; created_at: string; source: string | null }, Blk, BlkX, { phone: number; complaints: number }, { day: string | null }, { country: "CA" | "US"; source: "CNAC" | "NANPA"; as_of: string }]
  >([
    { sql: "SELECT name, department, category, description, hours, tip, website FROM organizations WHERE phone = ?", params: [key] },
    { sql: "SELECT ftc_total, ftc_robocall, ftc_first, ftc_last, c_total, c_last, c_top_type, c_types FROM numbers WHERE phone = ?", params: [key] },
    { sql: "SELECT ym, n FROM ftc_monthly WHERE phone = ? ORDER BY ym", params: [key] },
    { sql: "SELECT state, n FROM ftc_states WHERE phone = ? ORDER BY n DESC, state LIMIT 6", params: [key] },
    { sql: "SELECT s.name, f.n FROM ftc_subjects f JOIN ftc_subject_names s ON s.id = f.subject WHERE f.phone = ? ORDER BY f.n DESC, s.name", params: [key] },
    {
      sql: `SELECT id, type, comment, created_at, source FROM reports
            WHERE phone = ? AND hidden = 0 AND source IS NOT 'ftc_dnc' ORDER BY created_at DESC LIMIT 5`,
      params: [key],
    },
    {
      sql: `SELECT b.country, b.region, b.rate_center, r.name AS place, b.carrier, b.source, b.as_of, b.status
            FROM number_blocks b LEFT JOIN rate_center_names r ON r.state = b.region AND r.rate_center = b.rate_center
            WHERE b.npanxx = ?`,
      params: [npanxx],
    },
    { sql: "SELECT status, carrier FROM number_blocks_x WHERE npanxxx = ?", params: [Math.floor(key / 1000)] },
    {
      // Must match the numbers_by_block index expressions exactly.
      sql: `SELECT phone, ftc_total + c_total AS complaints FROM numbers
            WHERE phone / 10000 = ? AND phone != ? AND ftc_total + c_total > 0
            ORDER BY ftc_total + comm_total DESC LIMIT 5`,
      params: [npanxx, key],
    },
    { sql: "SELECT max(day) AS day FROM ftc_ingest_log", params: [] },
    // Is this area code in the block data at all? If it is but the exchange
    // isn't, the exchange isn't assigned to any carrier. One row.
    {
      sql: "SELECT country, source, as_of FROM number_blocks WHERE npanxx BETWEEN ? AND ? LIMIT 1",
      params: [npa * 1000, npa * 1000 + 999],
    },
  ]);

  const num = nums[0];
  // Fill months between the first and last complaint so the chart shows gaps.
  const filled: { ym: string; n: number }[] = [];
  if (monthly.length) {
    const byYm = new Map(monthly.map((m) => [m.ym, m.n]));
    let y = Math.floor(monthly[0].ym / 100);
    let m = monthly[0].ym % 100;
    const end = monthly[monthly.length - 1].ym;
    while (y * 100 + m <= end) {
      filled.push({ ym: `${y}-${String(m).padStart(2, "0")}`, n: byYm.get(y * 100 + m) ?? 0 });
      if (++m > 12) {
        m = 1;
        y++;
      }
    }
  }

  let block: Block | null = null;
  const b = blocks[0];
  const npaKnown = npaRows[0];
  if (!b && npaKnown && !TOLL_FREE.has(npa)) {
    block = { country: npaKnown.country, region: null, city: null, rateCentre: null, carrier: null, source: npaKnown.source, asOf: npaKnown.as_of, status: "unassigned" };
  } else if (b) {
    const x = xblocks[0];
    const unassigned = b.status !== "assigned" || x?.status === "available";
    const city = b.country === "CA" ? b.rate_center : b.place;
    block = {
      country: b.country,
      region: b.region,
      city,
      rateCentre: !city && b.country === "US" ? b.rate_center : null,
      carrier: unassigned ? null : carrierLabel(x?.carrier ?? b.carrier),
      source: b.source,
      asOf: b.as_of,
      status: unassigned ? "unassigned" : "assigned",
    };
  }

  return {
    phone: n,
    org: orgs[0] ?? null,
    ftc: {
      total: num?.ftc_total ?? 0,
      robocalls: num?.ftc_robocall ?? 0,
      first: ymd(num?.ftc_first ?? null),
      last: ymd(num?.ftc_last ?? null),
      monthly: filled,
      states,
      subjects: subjects.map((s) => ({ label: subjectLabel(s.name), raw: s.name, n: s.n })),
    },
    community: {
      total: num?.c_total ?? 0,
      last: num?.c_last ?? null,
      topType: num?.c_top_type ?? null,
      types: num?.c_types ? (JSON.parse(num.c_types) as Record<string, number>) : {},
      recent: reports.map((r) => ({ id: r.id, type: r.type, comment: r.comment, createdAt: r.created_at, source: r.source })),
    },
    block,
    tollFree: TOLL_FREE.has(npa),
    neighbours: neighbours.map((r) => ({ phone: String(r.phone), complaints: r.complaints })),
    ftcDataThrough: latest[0]?.day ?? null,
  };
}

export type Verdict = {
  level: "high" | "medium" | "low" | "none" | "verified";
  label: string;
  reason: string;
};

const MS_DAY = 86_400_000;
export function daysSince(iso: string | null, now: Date): number | null {
  if (!iso) return null;
  return Math.max(0, Math.floor((now.getTime() - Date.parse(iso.slice(0, 10) + "T00:00:00Z")) / MS_DAY));
}

export function formatDate(iso: string): string {
  const d = new Date(iso.slice(0, 10) + "T00:00:00Z");
  return d.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

// Risk from three measured facts: how many complaints, how recent the latest
// one is, and what share were robocalls. The thresholds are stated here and on
// the methodology page; the reason line prints the facts behind the level.
//   high:   100+ complaints, or 20+ with the latest in the last 90 days
//   medium: 20+ complaints, or 3+ with the latest in the last 365 days,
//           or 3+ complaints of which at least 75% were robocalls
//   low:    any other number with complaints
// Recency is measured against the date of the latest FTC data, not the clock,
// so a cached page never drifts and the same data always gives the same level.
export function verdict(d: NumberData): Verdict {
  const now = new Date((d.ftcDataThrough ?? "2026-10-15") + "T00:00:00Z");
  if (d.org) return { level: "verified", label: "Verified organization", reason: `Listed as ${d.org.name ?? "a verified organization"}${d.org.department ? ` (${d.org.department})` : ""}.` };
  const total = d.ftc.total + d.community.total;
  if (total === 0) {
    return {
      level: "none",
      label: "No complaints on record",
      reason: d.block?.status === "unassigned"
        ? "No complaints yet, but this number's block isn't assigned to any carrier, so a call showing it almost certainly used a spoofed caller ID."
        : "Nobody has complained about this number to the FTC or reported it here.",
    };
  }
  const lastIso = [d.ftc.last, d.community.last?.slice(0, 10) ?? null].filter(Boolean).sort().pop() ?? null;
  const ago = daysSince(lastIso, now);
  const robo = d.ftc.total ? d.ftc.robocalls / d.ftc.total : 0;
  let level: Verdict["level"] = "low";
  if (total >= 100 || (total >= 20 && ago !== null && ago <= 90)) level = "high";
  else if (total >= 20 || (total >= 3 && ago !== null && ago <= 365) || (total >= 3 && robo >= 0.75)) level = "medium";
  const parts = [countPhrase(d.ftc.total, d.community.total)];
  if (lastIso) parts.push(`latest ${formatDate(lastIso)}`);
  if (d.ftc.total >= 3) parts.push(`${Math.round(robo * 100)}% robocalls`);
  let reason = parts.join(", ") + ".";
  if (d.block?.status === "unassigned") reason += " The number's block isn't assigned to any carrier, so the caller ID was likely spoofed.";
  return {
    level,
    label: level === "high" ? "High risk" : level === "medium" ? "Medium risk" : "Low risk",
    reason,
  };
}

// "399 complaints" (FTC only), "4 reports" (community only), or
// "12 complaints and reports" (both): FTC complaints and community reports
// are different things and are never called by each other's name.
export function countPhrase(ftc: number, community: number): string {
  const total = ftc + community;
  const nf = total.toLocaleString("en-CA");
  if (community === 0) return `${nf} complaint${total === 1 ? "" : "s"}`;
  if (ftc === 0) return `${nf} report${total === 1 ? "" : "s"}`;
  return `${nf} complaints and reports`;
}

// "City, Province/State" when a reliable place name exists, otherwise null:
// never a bare state, and never a raw rate-centre abbreviation (those are
// shown in the body, labelled, via block.rateCentre).
export function placeLabel(d: NumberData): string | null {
  if (!d.block || d.block.status !== "assigned" || !d.block.city) return null;
  return [d.block.city, d.block.region].filter(Boolean).join(", ");
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const monthLabel = (ym: string) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;

// Source labels for community reports: what the row actually is.
export function reportSource(r: CommunityReport): { label: string; imported: boolean } {
  switch (r.source) {
    case null:
      return { label: "Report submitted on Canadial", imported: false };
    case "800notes_com":
      return { label: "Report imported from 800notes.com", imported: true };
    case "reversecanada_com":
      return { label: "Listed as suspicious on ReverseCanada.com", imported: true };
    default:
      return { label: `Imported from ${r.source}`, imported: true };
  }
}
