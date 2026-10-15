import { createHash } from "crypto";
import { batch } from "@/lib/d1";
import { authorize, json } from "@/lib/admin-auth";

// Import endpoint for the daily jobs (.github/workflows/daily-import.yml).
// The Python importers fetch and shape the source data; this writes it, so all
// database access goes through the Worker's D1 binding and the workflow needs
// no database credentials — only ADMIN_TOKEN.
//
//   curl -X POST https://www.canadial.com/api/admin/import \
//     -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
//     -d '{"source":"reversecanada_com","rows":[{"phone_number":"4165551234","type":"Other","comment":"..."}]}'
//
// Rows are deduplicated on dedupe_key = md5(phone|comment|source), the same
// key Supabase generated, so re-sending a batch inserts nothing twice. Counters
// and rollups are not touched here: the workflow calls /api/admin/refresh once
// after all sources are in.
export const dynamic = "force-dynamic";

// source -> the ip_hash marker its rows carried on Supabase.
const SOURCES: Record<string, string> = { ftc_dnc: "ftc_open_data", reversecanada_com: "community_report" };
const TYPES = new Set(["Scam", "Telemarketer", "Robocall", "Debt Collector", "Other"]);
const MAX_ROWS = 500;

type Row = { phone_number?: unknown; type?: unknown; comment?: unknown; created_at?: unknown };

export async function POST(req: Request) {
  const denied = authorize(req);
  if (denied) return denied;

  let body: { source?: unknown; rows?: unknown };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Body must be JSON." });
  }
  const source = typeof body.source === "string" ? body.source : "";
  if (!Object.hasOwn(SOURCES, source)) return json(400, { error: "Unknown `source`." });
  if (!Array.isArray(body.rows) || body.rows.length > MAX_ROWS) {
    return json(400, { error: `\`rows\` must be an array of at most ${MAX_ROWS}.` });
  }

  const valid: { phone: string; type: string; comment: string | null; createdAt: string | null }[] = [];
  const rejected: number[] = [];
  (body.rows as Row[]).forEach((r, i) => {
    const phone = typeof r.phone_number === "string" ? r.phone_number : "";
    const type = typeof r.type === "string" && TYPES.has(r.type) ? r.type : null;
    const comment = typeof r.comment === "string" ? r.comment.slice(0, 1000) : null;
    const createdAt =
      typeof r.created_at === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(r.created_at)
        ? r.created_at
        : null;
    if (!/^\d{10}$/.test(phone) || !type) rejected.push(i);
    else valid.push({ phone, type, comment, createdAt });
  });

  if (valid.length === 0) return json(200, { received: body.rows.length, inserted: 0, rejected });

  const results = await batch(
    valid.map((r) => ({
      sql: `INSERT INTO reports (id, phone, is_spam, type, comment, source, ip_hash, created_at, hidden, dedupe_key)
            VALUES (?, ?, 1, ?, ?, ?, ?, coalesce(?, strftime('%Y-%m-%dT%H:%M:%f', 'now')), 0, ?)
            ON CONFLICT (dedupe_key) DO NOTHING
            RETURNING phone`,
      params: [
        crypto.randomUUID(),
        Number(r.phone),
        r.type,
        r.comment,
        source,
        SOURCES[source],
        r.createdAt,
        createHash("md5").update(`${r.phone}|${r.comment ?? ""}|${source}`).digest("hex"),
      ],
    }))
  );
  const inserted = results.filter((rows) => rows.length > 0).length;
  const touched = [...new Set(valid.filter((_, i) => results[i].length > 0).map((r) => r.phone))];

  return json(200, { received: body.rows.length, inserted, rejected, touched });
}
