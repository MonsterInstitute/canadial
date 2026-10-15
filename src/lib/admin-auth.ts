import "server-only";
import { timingSafeEqual } from "crypto";

// Bearer-token check shared by the admin endpoints. Fails closed: with the
// secret unset the endpoint answers 503 and is unusable, never open — a
// missing variable in some environment must not expose writes.

export function json(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

// Constant-time compare, so a wrong token can't be narrowed down by timing.
// Lengths are compared first because timingSafeEqual throws on a mismatch.
function tokenMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Returns a response to send back when the request is not authorized, or null.
export function authorize(req: Request, secretName = "ADMIN_TOKEN"): Response | null {
  const expected = process.env[secretName];
  if (!expected) return json(503, { error: "Not configured." });
  const header = req.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!provided || !tokenMatches(provided, expected)) return json(401, { error: "Unauthorized." });
  return null;
}
