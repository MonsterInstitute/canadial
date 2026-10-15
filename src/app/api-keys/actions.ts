"use server";

import { randomBytes } from "crypto";
import { run } from "@/lib/d1";

export type KeyState = { ok: boolean; message: string; apiKey?: string };

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function requestApiKey(
  _prev: KeyState,
  formData: FormData
): Promise<KeyState> {
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const email = String(formData.get("email") ?? "").trim().slice(0, 160);
  const use = String(formData.get("use") ?? "").trim().slice(0, 60);

  if (!name || !EMAIL_RE.test(email)) {
    return { ok: false, message: "Please enter a valid name and email address." };
  }

  const apiKey = "cnd_live_" + randomBytes(24).toString("hex");

  // The schema has no "intended use" column, so fold it into the name for now.
  const label = use ? `${name} (${use})` : name;

  try {
    // Same defaults the Supabase table had: free tier, 100/month, the usage
    // window resetting 30 days out.
    await run(
      `INSERT INTO api_keys (id, key, name, email, tier, monthly_limit, usage_count, usage_reset_at, created_at, is_active)
       VALUES (?, ?, ?, ?, 'free', 100, 0,
               strftime('%Y-%m-%dT%H:%M:%f', 'now', '+30 days'), strftime('%Y-%m-%dT%H:%M:%f', 'now'), 1)`,
      [crypto.randomUUID(), apiKey, label, email]
    );
  } catch (e) {
    console.error("requestApiKey insert failed:", e);
    return {
      ok: false,
      message: "Could not create your key right now. Please try again later.",
    };
  }

  return {
    ok: true,
    message: "Your free API key is ready. Copy it now — for security it won't be shown again.",
    apiKey,
  };
}
