import { authorize, json } from "@/lib/admin-auth";
import { rebuildBlocks } from "@/lib/blocks-rebuild";

// Rebuild number_blocks / number_blocks_x from the files stored for `date`
// and swap them in atomically (or keep the current tables if the new ones
// look truncated). Body: {"date":"YYYY-MM-DD"}.
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  const denied = authorize(req);
  if (denied) return denied;
  let body: { date?: unknown };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Body must be JSON." });
  }
  const date = typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : null;
  if (!date) return json(400, { error: "`date` must be YYYY-MM-DD." });
  try {
    const result = await rebuildBlocks(date);
    return json(result.swapped ? 200 : 409, result);
  } catch (e) {
    console.error("blocks rebuild failed:", e);
    return json(500, { error: e instanceof Error ? e.message : String(e) });
  }
}
