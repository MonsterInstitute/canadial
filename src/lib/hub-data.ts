import "server-only";
import { all, batch, first } from "./d1";

// Data for the hub pages. Every read is a primary-key lookup or a bounded
// index range (LIMIT), never a scan.

export type ListedNumber = { phone: string; complaints: number; ftc: number; community: number };

export async function getHub(slug: string) {
  const [stats, rows] = await batch<[{ payload: string; refreshed_at: string }, { phone: number; n: number; ftc_total: number; c_total: number }]>([
    { sql: "SELECT payload, refreshed_at FROM hub_stats WHERE hub = ?", params: [slug] },
    {
      sql: `SELECT h.phone, h.n, n.ftc_total, n.c_total FROM hub_numbers h JOIN numbers n ON n.phone = h.phone
            WHERE h.hub = ? ORDER BY h.rank LIMIT 100`,
      params: [slug],
    },
  ]);
  return {
    stats: stats[0] ? (JSON.parse(stats[0].payload) as { numbers: number; complaints: number; listed: number }) : null,
    refreshedAt: stats[0]?.refreshed_at ?? null,
    numbers: rows.map((r) => ({ phone: String(r.phone), inCategory: r.n, ftc: r.ftc_total, community: r.c_total })),
  };
}

export async function getTrending() {
  const rows = await all<{ day: string; phone: number; n: number; ftc_total: number; ftc_first: number | null }>(
    `SELECT t.day, t.phone, t.n, n.ftc_total, n.ftc_first FROM ftc_daily_top t JOIN numbers n ON n.phone = t.phone
     WHERE t.day = (SELECT max(day) FROM ftc_daily_top) ORDER BY t.rank LIMIT 100`
  );
  const recent = await all<{ phone: number; type: string | null; created_at: string; source: string | null }>(
    `SELECT phone, type, created_at, source FROM reports
     WHERE hidden = 0 AND is_spam = 1 AND source IS NOT 'ftc_dnc' ORDER BY created_at DESC LIMIT 20`
  );
  return { day: rows[0]?.day ?? null, numbers: rows, recent };
}

export async function getBlock(npanxx: number) {
  const [blocks, xblocks, numbers] = await batch<
    [
      { country: string; region: string | null; rate_center: string | null; place: string | null; carrier: string | null; status: string; pooled: number; source: string; as_of: string },
      { npanxxx: number; status: string; carrier: string | null },
      { phone: number; ftc_total: number; c_total: number }
    ]
  >([
    {
      sql: `SELECT b.country, b.region, b.rate_center, r.name AS place, b.carrier, b.status, b.pooled, b.source, b.as_of
            FROM number_blocks b LEFT JOIN rate_center_names r ON r.state = b.region AND r.rate_center = b.rate_center
            WHERE b.npanxx = ?`,
      params: [npanxx],
    },
    { sql: "SELECT npanxxx, status, carrier FROM number_blocks_x WHERE npanxxx BETWEEN ? AND ? ORDER BY npanxxx", params: [npanxx * 10, npanxx * 10 + 9] },
    {
      // Must match the numbers_by_block index expressions exactly.
      sql: `SELECT phone, ftc_total, c_total FROM numbers WHERE phone / 10000 = ? AND ftc_total + c_total > 0
            ORDER BY ftc_total + comm_total DESC LIMIT 50`,
      params: [npanxx],
    },
  ]);
  return { block: blocks[0] ?? null, xblocks, numbers };
}

export async function getAreaRows(codes: string[]) {
  if (!codes.length) return [];
  return all<{ code: number; payload: string }>(
    `SELECT code, payload FROM area_summaries2 WHERE code IN (${codes.map(() => "?").join(",")})`,
    ...codes.map(Number)
  );
}

export async function latestFtcDay(): Promise<string | null> {
  return (await first<{ day: string | null }>("SELECT max(day) AS day FROM ftc_ingest_log"))?.day ?? null;
}
