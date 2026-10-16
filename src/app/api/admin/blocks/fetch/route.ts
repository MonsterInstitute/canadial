import { authorize, json } from "@/lib/admin-auth";
import { fetchBlockFiles } from "@/lib/blocks-rebuild";

// Download the CNAC and NANPA block files into R2 (blocks/raw/<date>/).
// Called monthly by .github/workflows/blocks-monthly.yml, then .../rebuild.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const denied = authorize(req);
  if (denied) return denied;
  const date = new Date().toISOString().slice(0, 10);
  try {
    return json(200, { date, files: await fetchBlockFiles(date) });
  } catch (e) {
    console.error("blocks fetch failed:", e);
    return json(502, { error: e instanceof Error ? e.message : String(e) });
  }
}
