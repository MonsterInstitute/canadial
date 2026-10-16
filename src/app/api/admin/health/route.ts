import { getCloudflareContext } from "@opennextjs/cloudflare";
import { authorize, json } from "@/lib/admin-auth";

// Read-only numbers for .github/workflows/health.yml: database size and how
// fresh the materialized rollups are. Three primary-key/aggregate reads over
// tiny tables; D1 reports the database size with every query.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = authorize(req);
  if (denied) return denied;
  const { env } = await getCloudflareContext({ async: true });
  const db = (env as { DB: D1Database }).DB;
  const res = await db
    .prepare(
      `SELECT
         (SELECT refreshed_at FROM site_stats2 WHERE id = 1) AS site_stats,
         (SELECT min(refreshed_at) FROM area_summaries2) AS area_summaries_oldest,
         (SELECT count(*) FROM area_summaries2) AS area_codes,
         (SELECT max(refreshed_at) FROM monthly_reports2) AS monthly_reports`
    )
    .first<Record<string, unknown>>();
  const meta = await db.prepare("SELECT 1").run();
  return json(200, { db_bytes: meta.meta.size_after ?? null, ...res });
}
