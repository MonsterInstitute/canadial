import { revalidatePath } from "next/cache";
import { all, first, run } from "@/lib/d1";
import { refreshArea, refreshNumber } from "@/lib/refresh";
import { purgeNumberPages } from "@/lib/edge-cache";
import { REPORTS_CONTENT } from "@/lib/i18n";
import { authorize, json } from "@/lib/admin-auth";

// Moderation endpoint: hide or unhide a single spam report.
//
// Hiding is a soft delete. Nothing in the codebase issues DELETE against
// `reports` (a CI check enforces it), so the worst this endpoint can do is make
// a row invisible, and every call is reversible by sending the opposite
// `hidden` value. D1 Time Travel (30 days) is the backstop beyond that.
//
//   curl -X POST https://www.canadial.com/api/admin/moderate \
//     -H "Authorization: Bearer $ADMIN_TOKEN" \
//     -H "Content-Type: application/json" \
//     -d '{"id":"<report uuid>","hidden":true,"reason":"abusive comment"}'
//
// GET with the same auth lists what is currently hidden.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const denied = authorize(req);
  if (denied) return denied;

  let data: unknown[];
  try {
    data = await all(
      `SELECT id, printf('%d', phone) AS phone_number, type, comment, created_at, hidden_reason
       FROM reports WHERE hidden = 1 ORDER BY created_at DESC LIMIT 200`
    );
  } catch (e) {
    console.error("moderate GET failed:", e);
    return json(500, { error: "Could not list hidden reports." });
  }
  return json(200, { hidden: data, count: data.length });
}

export async function POST(req: Request) {
  const denied = authorize(req);
  if (denied) return denied;

  let body: { id?: unknown; hidden?: unknown; reason?: unknown };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Body must be JSON." });
  }

  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) return json(400, { error: "Provide the report's `id`." });
  if (typeof body.hidden !== "boolean") {
    return json(400, { error: "`hidden` must be true or false." });
  }
  const hidden = body.hidden;

  // Select first so the response can name the number, and so a bad id is a 404
  // rather than a silent no-op.
  type Existing = { id: string; phone: number; comment: string | null; hidden: number; created_at: string };
  let existing: Existing | null;
  try {
    existing = await first<Existing>(
      "SELECT id, phone, comment, hidden, created_at FROM reports WHERE id = ?",
      id
    );
  } catch (e) {
    console.error("moderate lookup failed:", e);
    return json(500, { error: "Could not load that report." });
  }
  if (!existing) return json(404, { error: "No report with that id." });

  const reason = typeof body.reason === "string" ? body.reason.slice(0, 500) : null;
  try {
    // Hide, never delete: the reason is kept with the row so a disputed
    // decision stays answerable.
    await run("UPDATE reports SET hidden = ?, hidden_reason = ? WHERE id = ?", [
      hidden ? 1 : 0,
      hidden ? reason : null,
      id,
    ]);
  } catch (e) {
    console.error("moderate update failed:", e);
    return json(500, { error: "Could not update that report." });
  }

  const phone = String(existing.phone);
  const areaCode = phone.slice(0, 3);
  const ym = existing.created_at.slice(0, 7);

  // The number's counters and the materialized rollups (its area code, the
  // site stats, the monthly reports) would otherwise keep counting a hidden
  // report until the next daily refresh. The row is already hidden and every
  // list read filters it out, so a failed refresh is logged, not fatal.
  try {
    await refreshNumber(existing.phone);
    await refreshArea(existing.phone / 10000000 | 0);
  } catch (e) {
    console.error(`moderation: refresh for ${phone} failed:`, e);
  }

  // The number's own page, its area code, and the homepage lists all show this
  // report; drop their cached copies so the change is visible immediately
  // rather than at the next revalidate (a day for number pages).
  await purgeNumberPages([phone], new URL(req.url).origin);
  revalidatePath(`/area/${areaCode}`);
  revalidatePath("/");
  if (/^\d{4}-\d{2}$/.test(ym)) {
    const monthPath = `/reports/${ym.replace("-", "/")}`;
    revalidatePath(monthPath);
    for (const lang of Object.keys(REPORTS_CONTENT)) revalidatePath(`/${lang}${monthPath}`);
  }

  console.log(
    `moderation: report ${id} on ${phone} ${hidden ? "hidden" : "unhidden"}` +
      (reason ? ` — ${reason}` : "")
  );

  return json(200, {
    id,
    phone_number: phone,
    hidden,
    was_hidden: existing.hidden === 1,
  });
}
