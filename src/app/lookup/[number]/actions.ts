"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";
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

  const { error } = await supabaseAdmin.from("spam_reports").insert({
    phone_number: phone,
    is_spam,
    type,
    comment: comment || null,
  });

  if (error) {
    // Surface the real cause in server logs (auth/RLS/schema) instead of hiding it.
    console.error("submitReport insert failed:", error.code, error.message);
    return { ok: false, message: "Could not save your report. Please try again." };
  }

  // Refresh this lookup page and the homepage's recent-reports list.
  revalidatePath(`/lookup/${phone}`);
  revalidatePath("/");

  return { ok: true, message: "Thanks! Your report has been submitted." };
}
