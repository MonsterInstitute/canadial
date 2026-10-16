// Campaigns: numbers in one NPA-NXX block, with the same main FTC subject,
// first reported in quick succession, in a group too large to be chance.
// Computed per area code by the "campaigns" refresh part (src/lib/refresh.ts);
// pages read the result by primary key.
//
// The rule, measured on the full FTC archive before it was adopted:
//   * a number's subject is its most-complained FTC subject (ties: lower id);
//     numbers whose subject says nothing ("No Subject Provided", "Other") and
//     toll-free numbers are left out;
//   * within one block and subject, numbers ordered by first-complaint day form
//     a group while each first complaint is at most GAP_DAYS after the
//     previous one;
//   * a group of MIN_SIZE+ numbers counts when Poisson P(X >= size) < 1e-9,
//     the expected count being the area code's numbers with that subject first
//     reported in the group's date range, divided by the area code's blocks
//     that have any FTC number.
//
// Why not "overlapping complaint date ranges": one long-lived number bridges
// everything in its block (median group span 223 days), and shuffling numbers
// into random blocks of the same area code gave 64% as many "members" — mostly
// chance. With this rule the shuffled control gives ~15% as many, so pages say
// what the group is (dates, size, subject) and call it likely, not certain.

export const GAP_DAYS = 3;
export const MIN_SIZE = 3;
export const LOG10_P = -9;
// Subjects that say nothing about the call. Matched by name: ids are assigned
// in ingest order, so they differ between databases.
export const GENERIC_SUBJECT_NAMES = new Set(["No Subject Provided", "Other", "(not given)"]);
export const TOLL_FREE = new Set([800, 833, 844, 855, 866, 877, 888]);

export type CampaignInput = { phone: number; subject: number; first: number /* yyyymmdd */ };
export type Campaign = { id: number; npanxx: number; subject: number; firstDay: number; lastDay: number; members: number[] };

const MS_DAY = 86_400_000;
export const dayNumber = (d: number) => Date.UTC(Math.floor(d / 10000), (Math.floor(d / 100) % 100) - 1, d % 100) / MS_DAY;

// log10 P(X >= k) for X ~ Poisson(lam), k >= 1.
export function log10PoissonSf(k: number, lam: number): number {
  let lg = 0;
  for (let j = 2; j <= k; j++) lg += Math.log(j);
  const t = -lam + k * Math.log(lam) - lg;
  let s = 1;
  let term = 1;
  for (let j = k + 1; j <= k + 10_000; j++) {
    term *= lam / j;
    s += term;
    if (term < 1e-17 * s) break;
  }
  return (t + Math.log(s)) / Math.LN10;
}

// One area code's numbers with FTC complaints (any subject: the block count
// uses them all). Returns that area code's campaigns.
export function campaignsForArea(rows: CampaignInput[], genericIds: Set<number>): Campaign[] {
  const blocks = new Set(rows.map((r) => Math.floor(r.phone / 10_000)));
  const cand = rows
    .filter((r) => !genericIds.has(r.subject))
    .map((r) => ({ block: Math.floor(r.phone / 10_000), subject: r.subject, day: dayNumber(r.first), first: r.first, phone: r.phone }))
    .sort((a, b) => a.block - b.block || a.subject - b.subject || a.day - b.day || a.phone - b.phone);
  const firsts = new Map<number, number[]>();
  for (const c of cand) {
    let v = firsts.get(c.subject);
    if (!v) firsts.set(c.subject, (v = []));
    v.push(c.day);
  }
  for (const v of firsts.values()) v.sort((a, b) => a - b);
  // Count of v's values in [lo, hi] (v sorted).
  const between = (v: number[], lo: number, hi: number) => upper(v, hi) - lower(v, lo);

  const out: Campaign[] = [];
  for (let i = 0; i < cand.length; ) {
    let j = i + 1;
    while (j < cand.length && cand[j].block === cand[i].block && cand[j].subject === cand[i].subject && cand[j].day - cand[j - 1].day <= GAP_DAYS) j++;
    if (j - i >= MIN_SIZE) {
      const g = cand.slice(i, j);
      const lam = between(firsts.get(g[0].subject)!, g[0].day, g[g.length - 1].day) / blocks.size;
      if (log10PoissonSf(g.length, lam) < LOG10_P) {
        out.push({
          id: (g[0].block * 100 + g[0].subject) * 100_000 + g[0].day,
          npanxx: g[0].block,
          subject: g[0].subject,
          firstDay: g[0].first,
          lastDay: g[g.length - 1].first,
          members: g.map((x) => x.phone),
        });
      }
    }
    i = j;
  }
  return out;
}

// The id range holding one area code's campaigns (ids start with the npanxx).
export const campaignIdRange = (npa: number): [number, number] => [npa * 1000 * 100 * 100_000, (npa + 1) * 1000 * 100 * 100_000 - 1];

function lower(v: number[], x: number) {
  let lo = 0, hi = v.length;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (v[m] < x) lo = m + 1;
    else hi = m;
  }
  return lo;
}
function upper(v: number[], x: number) {
  let lo = 0, hi = v.length;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (v[m] <= x) lo = m + 1;
    else hi = m;
  }
  return lo;
}
