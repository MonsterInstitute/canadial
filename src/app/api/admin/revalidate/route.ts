import { timingSafeEqual } from "crypto";
import { revalidatePath } from "next/cache";
import { REPORTS_CONTENT } from "@/lib/i18n";
import { isValidAreaCode } from "@/lib/phone";
import { purgeNumberPages } from "@/lib/edge-cache";

// Revalidation endpoint for writers that run outside the app — the daily
// import in .github/workflows/daily-import.yml (scripts/revalidate_pages.py).
// In-app writers (submitReport, /api/admin/moderate) call revalidatePath()
// themselves and don't use this.
//
// Number pages are cached for a week, so without this a number that picked up
// its first imported report kept serving its old "no reports" page (or a
// stale count) for up to seven days.
//
//   curl -X POST https://www.canadial.com/api/admin/revalidate \
//     -H "Authorization: Bearer $REVALIDATE_SECRET" \
//     -H "Content-Type: application/json" \
//     -d '{"paths":["/lookup/4165551234","/area/416","/reports"]}'
//
// Only the ISR page shapes below are accepted; anything else is skipped and
// listed in the response. Invalidating marks a page stale — it is rebuilt on
// its next visit, not here — so a batch costs no renders by itself.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Per request. The caller batches; this keeps one call's work bounded.
const MAX_PATHS = 200;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Constant-time compare, as in ../moderate/route.ts.
function tokenMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// The concrete paths to revalidate for one requested path, or [] when it is
// not a page this endpoint may touch. A /reports path also covers its
// translated copies under /[lang]/reports, which show the same data.
function expand(path: string): string[] {
  if (path === "/") return ["/"];
  const lookup = path.match(/^\/lookup\/(\d{10})$/);
  if (lookup) return isValidAreaCode(lookup[1].slice(0, 3)) ? [path] : [];
  const area = path.match(/^\/area\/(\d{3})$/);
  if (area) return isValidAreaCode(area[1]) ? [path] : [];
  if (/^\/reports(\/20\d\d\/(0[1-9]|1[0-2]))?$/.test(path)) {
    return [path, ...Object.keys(REPORTS_CONTENT).map((lang) => `/${lang}${path}`)];
  }
  return [];
}

export async function POST(req: Request) {
  const expected = process.env.REVALIDATE_SECRET;
  // Fail closed: with no secret configured the endpoint is unusable, never open.
  if (!expected) return json(503, { error: "Revalidation is not configured." });

  const header = req.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!provided || !tokenMatches(provided, expected)) {
    return json(401, { error: "Unauthorized." });
  }

  let body: { paths?: unknown };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Body must be JSON." });
  }
  if (!Array.isArray(body.paths) || body.paths.some((p) => typeof p !== "string")) {
    return json(400, { error: "`paths` must be an array of strings." });
  }
  if (body.paths.length > MAX_PATHS) {
    return json(400, { error: `At most ${MAX_PATHS} paths per request.` });
  }

  const revalidated = new Set<string>();
  const skipped: string[] = [];
  for (const path of body.paths as string[]) {
    const targets = expand(path);
    if (targets.length === 0) skipped.push(path);
    for (const t of targets) revalidated.add(t);
  }
  // Number pages aren't ISR any more — they render on demand and are cached at
  // the edge by worker.ts — so for them "revalidate" means an edge purge.
  const numbers: string[] = [];
  for (const t of revalidated) {
    const m = t.match(/^\/lookup\/(\d{10})$/);
    if (m) numbers.push(m[1]);
    else revalidatePath(t);
  }
  await purgeNumberPages(numbers, new URL(req.url).origin);

  return json(200, { revalidated: revalidated.size, skipped });
}
