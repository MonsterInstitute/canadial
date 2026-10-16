"use server";

import { headers } from "next/headers";
import { run } from "@/lib/d1";
import { onceIn } from "@/lib/number-activity";
import { normalizePhone, isValidAreaCode } from "@/lib/phone";

// Contact and number-removal forms. Stored in D1, read through
// /api/admin/inbox, never shown publicly. Each IP may send one of each per
// ten minutes (tracked as a salted hash in the Cache API, not stored); a
// hidden "website" field catches simple bots.

export type FormState = { ok: boolean; message: string };
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

async function allowed(what: string): Promise<boolean> {
  const h = await headers();
  return onceIn(what, h.get("cf-connecting-ip") ?? h.get("x-forwarded-for") ?? "unknown", 600);
}

export async function sendContact(_: FormState, form: FormData): Promise<FormState> {
  if (String(form.get("website") ?? "")) return { ok: true, message: "Thanks — we'll reply by email." };
  const name = String(form.get("name") ?? "").trim().slice(0, 120);
  const email = String(form.get("email") ?? "").trim().slice(0, 200);
  const message = String(form.get("message") ?? "").trim().slice(0, 4000);
  if (!EMAIL.test(email) || message.length < 10) return { ok: false, message: "Please enter your email and a message." };
  if (!(await allowed("contact"))) return { ok: false, message: "Please wait a few minutes before sending another message." };
  try {
    await run(
      "INSERT INTO contact_messages (id, name, email, message, created_at) VALUES (?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))",
      [crypto.randomUUID(), name || null, email, message]
    );
  } catch (e) {
    console.error("sendContact failed:", e);
    return { ok: false, message: "Could not send your message. Please try again." };
  }
  return { ok: true, message: "Thanks — we'll reply by email." };
}

export async function requestRemoval(_: FormState, form: FormData): Promise<FormState> {
  if (String(form.get("website") ?? "")) return { ok: true, message: "Request received." };
  const phone = normalizePhone(String(form.get("phone") ?? ""));
  const name = String(form.get("name") ?? "").trim().slice(0, 120);
  const email = String(form.get("email") ?? "").trim().slice(0, 200);
  const relationship = String(form.get("relationship") ?? "").trim().slice(0, 40);
  const reason = String(form.get("reason") ?? "").trim().slice(0, 4000);
  if (phone.length !== 10 || !isValidAreaCode(phone.slice(0, 3))) return { ok: false, message: "Please enter the 10-digit phone number." };
  if (!name || !EMAIL.test(email) || reason.length < 10) return { ok: false, message: "Please fill in your name, email and the reason." };
  if (!(await allowed("removal"))) return { ok: false, message: "Please wait a few minutes before sending another request." };
  try {
    await run(
      `INSERT INTO removal_requests (id, phone, name, email, relationship, reason, created_at)
       VALUES (?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))`,
      [crypto.randomUUID(), Number(phone), name, email, relationship || null, reason]
    );
  } catch (e) {
    console.error("requestRemoval failed:", e);
    return { ok: false, message: "Could not save your request. Please try again." };
  }
  return { ok: true, message: "Request received. We review every request and reply by email." };
}
