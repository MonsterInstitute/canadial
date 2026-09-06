import { timingSafeEqual } from "crypto";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";

// Moderation endpoint: hide or unhide a single spam report.
//
// Hiding is a soft delete — see the 20260904210000 migration. Nothing here
// deletes: service_role has no DELETE on spam_reports, so the worst this
// endpoint can do is make a row invisible, and every call is reversible by
// sending the opposite `hidden` value.
//
//   curl -X POST https://www.canadial.com/api/admin/moderate \
//     -H "Authorization: Bearer $ADMIN_TOKEN" \
//     -H "Content-Type: application/json" \
//     -d '{"id":"<report uuid>","hidden":true,"reason":"abusive comment"}'
//
// GET with the same auth lists what is currently hidden.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Constant-time compare, so a wrong token can't be narrowed down by timing.
// Lengths are compared first because timingSafeEqual throws on a mismatch.
function tokenMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function authorize(req: Request): Response | null {
  const expected = process.env.ADMIN_TOKEN;
  // Fail closed: with no token configured the endpoint is unusable, never open.
  if (!expected) return json(503, { error: "Moderation is not configured." });

  const header = req.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!provided || !tokenMatches(provided, expected)) {
    return json(401, { error: "Unauthorized." });
  }
  return null;
}

export async function GET(req: Request) {
  const denied = authorize(req);
  if (denied) return denied;

  const { data, error } = await supabaseAdmin
    .from("spam_reports")
    .select("id, phone_number, type, comment, created_at")
    .eq("hidden", true)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("moderate GET failed:", error.message);
    return json(500, { error: "Could not list hidden reports." });
  }
  return json(200, { hidden: data ?? [], count: data?.length ?? 0 });
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
  const { data: existing, error: findErr } = await supabaseAdmin
    .from("spam_reports")
    .select("id, phone_number, comment, hidden")
    .eq("id", id)
    .maybeSingle();

  if (findErr) {
    console.error("moderate lookup failed:", findErr.message);
    return json(500, { error: "Could not load that report." });
  }
  if (!existing) return json(404, { error: "No report with that id." });

  const { error: updateErr } = await supabaseAdmin
    .from("spam_reports")
    .update({ hidden })
    .eq("id", id);

  if (updateErr) {
    console.error("moderate update failed:", updateErr.message);
    return json(500, { error: "Could not update that report." });
  }

  const phone = existing.phone_number as string;
  const areaCode = phone.slice(0, 3);

  // area_summaries is a materialized rollup refreshed daily, so without this a
  // hidden report would keep inflating the counts and type breakdown printed
  // beside it — and could still appear in the area's "top numbers" — until the
  // next nightly refresh. Refresh just this code; it is a single-code pass.
  const { error: refreshErr } = await supabaseAdmin.rpc("refresh_area_summaries", {
    p_code: areaCode,
  });
  if (refreshErr) {
    // The row is already hidden and every live read filters it out; only the
    // rollup is stale, and tonight's refresh fixes that. Worth logging, not
    // worth failing the moderation action.
    console.error(
      `moderation: refresh_area_summaries(${areaCode}) failed:`,
      refreshErr.message
    );
  }

  // The number's own page, its area code, and the homepage lists all show this
  // report; drop their cached copies so the change is visible immediately
  // rather than at the next revalidate (a day for number pages).
  revalidatePath(`/lookup/${phone}`);
  revalidatePath(`/area/${areaCode}`);
  revalidatePath("/");

  console.log(
    `moderation: report ${id} on ${phone} ${hidden ? "hidden" : "unhidden"}` +
      (typeof body.reason === "string" && body.reason ? ` — ${body.reason}` : "")
  );

  return json(200, {
    id,
    phone_number: phone,
    hidden,
    was_hidden: existing.hidden ?? false,
  });
}
