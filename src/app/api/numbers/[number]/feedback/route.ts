import { addFeedback, FEEDBACK_TYPES, firstTime, isRealVisitor, readActivity, type FeedbackType } from "@/lib/number-activity";

// "Did this number call you?" One answer per visitor per number per 30 days,
// same-site browsers only. Answers with the updated tallies.
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  if (!/^[2-9]\d{9}$/.test(number)) return Response.json({ error: "bad number" }, { status: 400 });
  let body: { called?: unknown; type?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad body" }, { status: 400 });
  }
  if (typeof body.called !== "boolean") return Response.json({ error: "`called` must be true or false" }, { status: 400 });
  const type = typeof body.type === "string" && (FEEDBACK_TYPES as readonly string[]).includes(body.type) ? (body.type as FeedbackType) : null;
  const phone = Number(number);
  if (!isRealVisitor(req)) return Response.json({ error: "not accepted" }, { status: 403 });
  if (!(await firstTime(req, "feedback", number, 30 * 86_400))) {
    return Response.json({ ...(await readActivity(phone)), accepted: false }, { headers: { "cache-control": "no-store" } });
  }
  return Response.json({ ...(await addFeedback(phone, body.called, type)), accepted: true }, { headers: { "cache-control": "no-store" } });
}
