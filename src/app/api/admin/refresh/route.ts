import { refreshAll } from "@/lib/refresh";
import { authorize, json } from "@/lib/admin-auth";

// Rebuilds per-number counters and every materialized rollup
// (src/lib/refresh.ts). Called by the daily workflow after the imports, and
// by hand after loading data:
//
//   curl -X POST https://www.canadial.com/api/admin/refresh -H "Authorization: Bearer $ADMIN_TOKEN"
//
// Seconds of database time by design; it never runs on a page render.
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  const denied = authorize(req);
  if (denied) return denied;
  try {
    const { ms } = await refreshAll();
    return json(200, { ok: true, ms });
  } catch (e) {
    console.error("refreshAll failed:", e);
    return json(500, { ok: false, error: e instanceof Error ? e.message : String(e) });
  }
}
