import { all } from "@/lib/d1";
import { authorize, json } from "@/lib/admin-auth";

// Removal requests and contact messages, newest first. Admin only.
//   curl -H "Authorization: Bearer $ADMIN_TOKEN" https://www.canadial.com/api/admin/inbox
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = authorize(req);
  if (denied) return denied;
  const [removals, messages] = await Promise.all([
    all("SELECT id, printf('%d', phone) AS phone, name, email, relationship, reason, created_at, status FROM removal_requests ORDER BY created_at DESC LIMIT 200"),
    all("SELECT id, name, email, message, created_at FROM contact_messages ORDER BY created_at DESC LIMIT 200"),
  ]);
  return json(200, { removals, messages });
}
