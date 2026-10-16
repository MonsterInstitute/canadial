import { readActivity } from "@/lib/number-activity";

// Current search count and feedback tallies for a number (two primary-key
// reads). Used when the visitor's view was already counted today. Edge-cached
// for a minute: counts that are a minute old are fine.
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  if (!/^[2-9]\d{9}$/.test(number)) return Response.json({ error: "bad number" }, { status: 400 });
  return Response.json(await readActivity(Number(number)), {
    headers: { "cache-control": "public, max-age=60, s-maxage=60" },
  });
}
