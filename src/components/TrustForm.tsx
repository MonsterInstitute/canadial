"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/trust-actions";

type Field = { name: string; label: string; type?: "text" | "email" | "tel" | "textarea" | "select"; options?: string[]; required?: boolean; placeholder?: string };

export default function TrustForm({
  action,
  fields,
  submit,
}: {
  action: (s: FormState, f: FormData) => Promise<FormState>;
  fields: Field[];
  submit: string;
}) {
  const [state, formAction, pending] = useActionState(action, { ok: false, message: "" });
  if (state.ok) return <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{state.message}</p>;
  const cls = "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm";
  return (
    <form action={formAction} className="space-y-4">
      {fields.map((f) => (
        <label key={f.name} className="block text-sm font-medium text-zinc-800">
          {f.label}
          {f.type === "textarea" ? (
            <textarea name={f.name} required={f.required} rows={5} className={cls} placeholder={f.placeholder} />
          ) : f.type === "select" ? (
            <select name={f.name} className={cls}>{f.options!.map((o) => <option key={o}>{o}</option>)}</select>
          ) : (
            <input name={f.name} type={f.type ?? "text"} required={f.required} className={cls} placeholder={f.placeholder} />
          )}
        </label>
      ))}
      {/* Honeypot: hidden from people, filled in by simple bots. */}
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      {state.message && <p className="text-sm text-red-700">{state.message}</p>}
      <button disabled={pending} className="rounded-lg bg-canada px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
        {pending ? "Sending…" : submit}
      </button>
    </form>
  );
}
