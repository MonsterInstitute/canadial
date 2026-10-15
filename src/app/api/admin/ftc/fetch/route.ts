import { getCloudflareContext } from "@opennextjs/cloudflare";
import { authorize, json } from "@/lib/admin-auth";
import { rawKey } from "@/lib/ftc-ingest";

// Fetch one FTC "DNC_Complaint_Numbers_<day>.csv" from ftc.gov and store it,
// byte for byte, in R2 (canadial-data/ftc/raw/<yyyy>/...). Raw files are the
// source of truth for the FTC aggregates: every aggregate can be rebuilt from
// them, which is what makes the FTC data reversible.
//
// It runs in the Worker because ftc.gov answers scripted clients elsewhere
// (a Mac, GitHub's runners) with a 1.3 KB HTML "404"; from Cloudflare it
// serves the files.
//
//   curl -X POST https://www.canadial.com/api/admin/ftc/fetch \
//     -H "Authorization: Bearer $ADMIN_TOKEN" -d '{"day":"2026-10-14"}'
//
// 200 {stored, existed, bytes, sha256} | 404 {missing} when the FTC has no file
// for that day (weekends, holidays) | 502 when ftc.gov answered with something
// that isn't the CSV.
export const dynamic = "force-dynamic";

const HEADER = "Company_Phone_Number,Created_Date,Violation_Date,Consumer_City,Consumer_State,Consumer_Area_Code,Subject,Recorded_Message_Or_Robocall";
const ATTEMPTS = 3;

async function sha256(buf: ArrayBuffer) {
  const d = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(req: Request) {
  const denied = authorize(req);
  if (denied) return denied;

  let body: { day?: unknown; force?: unknown };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Body must be JSON." });
  }
  const day = typeof body.day === "string" ? body.day : "";
  if (!/^20\d\d-\d\d-\d\d$/.test(day) || Number.isNaN(Date.parse(day))) {
    return json(400, { error: "`day` must be YYYY-MM-DD." });
  }

  const { env } = await getCloudflareContext({ async: true });
  const bucket = (env as { FTC_DATA?: R2Bucket }).FTC_DATA;
  if (!bucket) return json(503, { error: "FTC_DATA bucket is not bound." });

  const key = rawKey(day);
  if (body.force !== true) {
    const head = await bucket.head(key);
    if (head) {
      return json(200, { day, key, stored: true, existed: true, bytes: head.size, sha256: head.customMetadata?.sha256 });
    }
  }

  const url = `https://www.ftc.gov/sites/default/files/DNC_Complaint_Numbers_${day}.csv`;
  let lastError = "";
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "canadial-data/1.0 (+https://www.canadial.com)" },
        signal: AbortSignal.timeout(30_000),
      });
      const buf = await res.arrayBuffer();
      const head = new TextDecoder().decode(buf.slice(0, HEADER.length));
      if (res.status === 404 && head !== HEADER) return json(404, { day, missing: true });
      if (res.status === 200 && head === HEADER) {
        const digest = await sha256(buf);
        await bucket.put(key, buf, {
          httpMetadata: { contentType: "text/csv" },
          customMetadata: { sha256: digest, source_url: url, fetched_at: new Date().toISOString() },
        });
        return json(200, { day, key, stored: true, existed: false, bytes: buf.byteLength, sha256: digest });
      }
      lastError = `HTTP ${res.status}, ${buf.byteLength} bytes, starts ${JSON.stringify(head.slice(0, 40))}`;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
    await new Promise((r) => setTimeout(r, 1000 * attempt));
  }
  return json(502, { day, error: lastError });
}
