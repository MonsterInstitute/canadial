import "server-only";
import { batch } from "./d1";

// Search counts and "did this number call you?" tallies. Both are written only
// from browser requests that pass the checks below, and at most once per
// visitor per number per window, so writes are bounded by real visitors:
//   * same-site Origin (no cross-site or scripted POSTs from elsewhere);
//   * no known bot / headless / HTTP-library user agent;
//   * one view per visitor per number per day, one answer per 30 days —
//     remembered in the Cache API under a salted hash of IP + number, so no
//     IP address is stored anywhere.

const BOT_UA = /bot|crawl|spider|slurp|preview|fetch|scan|monitor|headless|phantom|puppeteer|playwright|selenium|lighthouse|python|curl|wget|httpclient|java\/|go-http|axios|node-fetch|okhttp|facebookexternalhit/i;
const SITE_HOSTS = new Set(["www.canadial.com", "next.canadial.com", "localhost", "127.0.0.1"]);

export const FEEDBACK_TYPES = ["scam", "telemarketer", "robocall", "debt", "silent", "other"] as const;
export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

export type Activity = {
  views: { total: number; week: number };
  feedback: { yes: number; no: number } & Record<FeedbackType, number>;
};

export function isRealVisitor(req: Request): boolean {
  const ua = req.headers.get("user-agent") ?? "";
  if (!ua || BOT_UA.test(ua)) return false;
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    return SITE_HOSTS.has(new URL(origin).hostname);
  } catch {
    return false;
  }
}

// Monday (UTC) of the current week, "YYYY-MM-DD".
export function weekStart(now = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

// True the first time this visitor does `what` for this number in the window.
export async function firstTime(req: Request, what: string, phone: string, ttlSeconds: number): Promise<boolean> {
  const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for") ?? "unknown";
  return onceIn(what, `${phone}|${ip}`, ttlSeconds);
}

// True the first time `subject` does `what` in the current window. The key is
// a hash kept only in the Cache API (per colo), so nothing identifying is
// stored. Also used to rate-limit the trust-page forms.
export async function onceIn(what: string, subject: string, ttlSeconds: number): Promise<boolean> {
  const window = Math.floor(Date.now() / 1000 / ttlSeconds);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${what}|${subject}|${window}`));
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  const key = new Request(`https://dedupe.canadial.invalid/${what}/${hex}`);
  const cache = (globalThis as unknown as { caches?: { default?: Cache } }).caches?.default;
  if (!cache) return true;
  if (await cache.match(key)) return false;
  await cache.put(key, new Response("1", { headers: { "cache-control": `max-age=${ttlSeconds}` } }));
  return true;
}

type Row = { total: number; week: number; week_start: string };
type Fb = Activity["feedback"];
const EMPTY_FB: Fb = { yes: 0, no: 0, scam: 0, telemarketer: 0, robocall: 0, debt: 0, silent: 0, other: 0 };

function shape(views: Row | undefined, fb: Fb | undefined): Activity {
  const wk = weekStart();
  return {
    views: { total: views?.total ?? 0, week: views && views.week_start === wk ? views.week : 0 },
    feedback: fb ?? EMPTY_FB,
  };
}

const READ_VIEWS = "SELECT total, week, week_start FROM number_views WHERE phone = ?";
const READ_FB = "SELECT yes, no, scam, telemarketer, robocall, debt, silent, other FROM number_feedback WHERE phone = ?";

export async function readActivity(phone: number): Promise<Activity> {
  const [v, f] = await batch<[Row, Fb]>([{ sql: READ_VIEWS, params: [phone] }, { sql: READ_FB, params: [phone] }]);
  return shape(v[0], f[0]);
}

export async function countView(phone: number): Promise<Activity> {
  const wk = weekStart();
  const [, v, f] = await batch<[unknown, Row, Fb]>([
    {
      sql: `INSERT INTO number_views (phone, total, week_start, week) VALUES (?1, 1, ?2, 1)
            ON CONFLICT (phone) DO UPDATE SET
              total = total + 1,
              week = CASE WHEN week_start = excluded.week_start THEN week + 1 ELSE 1 END,
              week_start = excluded.week_start`,
      params: [phone, wk],
    },
    { sql: READ_VIEWS, params: [phone] },
    { sql: READ_FB, params: [phone] },
  ]);
  return shape(v[0], f[0]);
}

export async function addFeedback(phone: number, called: boolean, type: FeedbackType | null): Promise<Activity> {
  const col = called ? "yes" : "no";
  const typeCol = called && type ? `, ${type} = ${type} + 1` : "";
  const insertType = called && type ? `, ${type}` : "";
  const [, v, f] = await batch<[unknown, Row, Fb]>([
    {
      // Column names come from the fixed FEEDBACK_TYPES list, never from input.
      sql: `INSERT INTO number_feedback (phone, ${col}${insertType}) VALUES (?1, 1${type && called ? ", 1" : ""})
            ON CONFLICT (phone) DO UPDATE SET ${col} = ${col} + 1${typeCol}`,
      params: [phone],
    },
    { sql: READ_VIEWS, params: [phone] },
    { sql: READ_FB, params: [phone] },
  ]);
  return shape(v[0], f[0]);
}
