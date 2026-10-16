import { countView, firstTime, isRealVisitor, readActivity } from "@/lib/number-activity";

// Page-view beacon from the number page (client-side, after load). Counts a
// view only for a real, same-site visitor's first view of this number today;
// always answers with the current counts. Never cached.
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  if (!/^[2-9]\d{9}$/.test(number)) return Response.json({ error: "bad number" }, { status: 400 });
  const phone = Number(number);
  const counted = isRealVisitor(req) && (await firstTime(req, "view", number, 86_400));
  const activity = counted ? await countView(phone) : await readActivity(phone);
  return Response.json({ ...activity, counted }, { headers: { "cache-control": "no-store" } });
}
