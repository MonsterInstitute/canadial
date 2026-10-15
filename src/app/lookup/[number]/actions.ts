"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { run } from "@/lib/d1";
import { refreshNumber } from "@/lib/refresh";
import { purgeNumberPages } from "@/lib/edge-cache";
import { normalizePhone } from "@/lib/lookup";

const VALID_TYPES = [
  "Scam",
  "Telemarketer",
  "Robocall",
  "Debt Collector",
  "Other",
];

export type ReportState = { ok: boolean; message: string };

export async function submitReport(
  _prev: ReportState,
  formData: FormData
): Promise<ReportState> {
  const phone = normalizePhone(String(formData.get("phone_number") || ""));
  if (phone.length !== 10) {
    return { ok: false, message: "Invalid phone number." };
  }

  const is_spam = formData.get("is_spam") === "on";
  const rawType = String(formData.get("type") || "Other");
  const type = VALID_TYPES.includes(rawType) ? rawType : "Other";
  const comment = String(formData.get("comment") || "").trim().slice(0, 1000);

  try {
    // Community reports have no source and no dedupe_key, so two people
    // reporting the same number with the same comment both go through — the
    // form must never reject a genuine submission. created_at uses the same
    // "YYYY-MM-DDTHH:MM:SS.fff" UTC form as the imported rows.
    await run(
      `INSERT INTO reports (id, phone, is_spam, type, comment, created_at, hidden)
       VALUES (?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%f', 'now'), 0)`,
      [crypto.randomUUID(), Number(phone), is_spam ? 1 : 0, type, comment || null]
    );
    await refreshNumber(Number(phone));
  } catch (e) {
    // Surface the real cause in server logs instead of hiding it.
    console.error("submitReport insert failed:", e);
    return { ok: false, message: "Could not save your report. Please try again." };
  }

  // The number page is cached at the edge (worker.ts); the homepage's
  // recent-reports list is ISR.
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  await purgeNumberPages([phone], host ? `${h.get("x-forwarded-proto") ?? "https"}://${host}` : undefined);
  revalidatePath("/");

  return { ok: true, message: "Thanks! Your report has been submitted." };
}
