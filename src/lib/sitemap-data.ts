import "server-only";
import { all } from "./d1";
import { SITE_URL } from "./config";

// Sitemap index + shards (Phase 5). /sitemap.xml is a sitemap index listing
// /sitemaps/core.xml and the number and NPA-NXX block shards; shard
// boundaries come from sitemap_shards (refresh.ts, daily), so each shard is
// one range read of the numbers_listed partial index. lastmod is always a real
// data date, never the time of the request.

export type Shard = { kind: "numbers" | "blocks"; shard: number; first: number; last: number; n: number; lastmod: string | null };

export async function getShards(): Promise<Shard[]> {
  return all<Shard>("SELECT kind, shard, first, last, n, lastmod FROM sitemap_shards ORDER BY kind, shard");
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function xmlResponse(body: string): Response {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n${body}`, {
    headers: { "content-type": "application/xml; charset=utf-8" },
  });
}

export function urlset(entries: { loc: string; lastmod?: string | null }[]): Response {
  const urls = entries
    .map((e) => `<url><loc>${esc(e.loc.startsWith("http") ? e.loc : SITE_URL + e.loc)}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ""}</url>`)
    .join("\n");
  return xmlResponse(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
}

export function sitemapIndex(entries: { loc: string; lastmod?: string | null }[]): Response {
  const items = entries
    .map((e) => `<sitemap><loc>${esc(SITE_URL + e.loc)}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ""}</sitemap>`)
    .join("\n");
  return xmlResponse(`<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</sitemapindex>\n`);
}

// "3.xml" -> 3; anything else -> null (404).
export function shardParam(raw: string): number | null {
  const m = /^(\d{1,4})\.xml$/.exec(raw);
  return m ? Number(m[1]) : null;
}

const ymd = (v: number | null) => (v ? `${String(v).slice(0, 4)}-${String(v).slice(4, 6)}-${String(v).slice(6, 8)}` : null);

export async function numberShardEntries(first: number, last: number) {
  const rows = await all<{ phone: number; ftc_last: number | null; c_last: string | null }>(
    "SELECT phone, ftc_last, c_last FROM numbers WHERE listed = 1 AND phone BETWEEN ? AND ? ORDER BY phone",
    first,
    last
  );
  return rows.map((r) => {
    const a = ymd(r.ftc_last);
    const b = r.c_last ? r.c_last.slice(0, 10) : null;
    return { loc: `/lookup/${r.phone}`, lastmod: a && b ? (a > b ? a : b) : (a ?? b) };
  });
}

export async function blockShardEntries(first: number, last: number) {
  const rows = await all<{ b: number; d: number | null }>(
    `SELECT phone / 10000 AS b, max(ftc_last) AS d FROM numbers
     WHERE listed = 1 AND phone BETWEEN ? AND ? GROUP BY 1 HAVING count(*) >= 2 ORDER BY 1`,
    first * 10000,
    last * 10000 + 9999
  );
  return rows.map((r) => ({ loc: `/area/${String(r.b).slice(0, 3)}/${String(r.b).slice(3)}`, lastmod: ymd(r.d) }));
}

export async function organizationNumbers(): Promise<string[]> {
  const rows = await all<{ phone: number }>("SELECT phone FROM organizations WHERE phone >= 2000000000 ORDER BY phone");
  return rows.map((r) => String(r.phone));
}
