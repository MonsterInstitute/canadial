import { authorize, json } from "@/lib/admin-auth";
import { ingestFtcDay } from "@/lib/ftc-ingest";

// Add one stored FTC day (see ../fetch) to the per-number aggregates. Each
// day is applied once; repeating the call is a no-op ("already_applied").
//
//   curl -X POST https://www.canadial.com/api/admin/ftc/ingest \
//     -H "Authorization: Bearer $ADMIN_TOKEN" -d '{"day":"2026-10-14"}'
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const denied = authorize(req);
  if (denied) return denied;
  let body: { day?: unknown };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Body must be JSON." });
  }
  const day = typeof body.day === "string" ? body.day : "";
  if (!/^20\d\d-\d\d-\d\d$/.test(day)) return json(400, { error: "`day` must be YYYY-MM-DD." });
  try {
    const result = await ingestFtcDay(day);
    return json(result.status === "no_file" ? 404 : 200, result);
  } catch (e) {
    console.error(`ftc ingest ${day} failed:`, e);
    return json(500, { day, error: e instanceof Error ? e.message : String(e) });
  }
}
