import { supabaseAdmin } from "@/lib/supabase";
import { normalizePhone } from "@/lib/phone";
import { lookupPhone } from "@/lib/lookup";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

function json(status: number, body: unknown, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS, ...extra },
  });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

type ApiKey = {
  id: string;
  monthly_limit: number;
  usage_count: number;
  usage_reset_at: string | null;
  is_active: boolean;
};

function deriveLabel(type: string | null, comments: string[]): string | null {
  const text = comments.join(" ").toLowerCase();
  if (type === "Scam" && /\b(cra|tax|revenue|arrest|sin)\b/.test(text))
    return "CRA Impersonation Scam";
  if (type === "Scam" && /immigration|deport|ircc|visa/.test(text))
    return "Immigration Scam";
  return type;
}

export async function GET(req: Request) {
  // 1. Authenticate
  const auth = req.headers.get("authorization") ?? "";
  const key = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!key) return json(401, { error: "Missing API key. Use 'Authorization: Bearer <key>'." });

  const { data: keyRow, error: keyErr } = await supabaseAdmin
    .from("api_keys")
    .select("id, monthly_limit, usage_count, usage_reset_at, is_active")
    .eq("key", key)
    .eq("is_active", true)
    .maybeSingle();

  if (keyErr || !keyRow) return json(401, { error: "Invalid or inactive API key." });
  const row = keyRow as ApiKey;

  // 2. Rate limit (reset the window if it has elapsed)
  let usage = row.usage_count;
  const now = new Date();
  if (row.usage_reset_at && new Date(row.usage_reset_at) < now) {
    usage = 0;
    await supabaseAdmin
      .from("api_keys")
      .update({
        usage_count: 0,
        usage_reset_at: new Date(now.getTime() + 30 * 86_400_000).toISOString(),
      })
      .eq("id", row.id);
  }
  if (usage >= row.monthly_limit) {
    return json(
      429,
      { error: "Monthly request limit exceeded.", limit: row.monthly_limit },
      { "X-RateLimit-Limit": String(row.monthly_limit), "X-RateLimit-Remaining": "0" }
    );
  }

  // 3. Validate phone
  const raw = new URL(req.url).searchParams.get("phone") ?? "";
  const phone = normalizePhone(raw);
  if (phone.length !== 10) {
    return json(400, { error: "Invalid phone number. Provide a 10-digit Canadian or US number." });
  }

  // 4. Look up
  const result = await lookupPhone(phone);

  // 5. Count this request (best-effort; not strictly atomic).
  await supabaseAdmin.from("api_keys").update({ usage_count: usage + 1 }).eq("id", row.id);
  const remaining = Math.max(0, row.monthly_limit - (usage + 1));
  const rlHeaders = {
    "X-RateLimit-Limit": String(row.monthly_limit),
    "X-RateLimit-Remaining": String(remaining),
  };

  // 6. Shape the response
  if (result.type === "legitimate") {
    const org = result.data;
    return json(
      200,
      {
        phone,
        risk_level: "safe",
        risk_score: 0,
        type: null,
        report_count: 0,
        label: org?.name ? `Verified: ${org.name}` : "Verified organization",
        is_legitimate: true,
        organization: { name: org?.name ?? null, category: org?.category ?? null },
        last_reported: null,
        source: "canadial_verified",
      },
      rlHeaders
    );
  }

  if (result.type === "spam") {
    const d = result.data;
    const reportCount: number = d.report_count;
    const riskLevel = reportCount >= 10 ? "high" : reportCount >= 3 ? "medium" : "low";
    const riskScore = riskLevel === "high" ? 85 : riskLevel === "medium" ? 60 : 30;
    const comments = (d.reports ?? [])
      .map((r: { comment?: string | null }) => r.comment ?? "")
      .filter(Boolean);
    const lastReported: string | null = d.reports?.[0]?.created_at
      ? String(d.reports[0].created_at).slice(0, 10)
      : null;
    return json(
      200,
      {
        phone,
        risk_level: riskLevel,
        risk_score: riskScore,
        type: d.most_common_type ?? null,
        report_count: reportCount,
        label: deriveLabel(d.most_common_type ?? null, comments),
        is_legitimate: false,
        organization: null,
        last_reported: lastReported,
        source: "canadial_community",
      },
      rlHeaders
    );
  }

  // unknown
  return json(
    200,
    {
      phone,
      risk_level: "unknown",
      risk_score: 0,
      type: null,
      report_count: 0,
      label: null,
      is_legitimate: false,
      organization: null,
      last_reported: null,
      source: "canadial_community",
    },
    rlHeaders
  );
}
