"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { submitReport, type ReportState } from "@/app/lookup/[number]/actions";

const TYPES = ["Scam", "Telemarketer", "Robocall", "Debt Collector", "Other"];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-canada px-5 py-2.5 font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
    >
      {pending ? "Submitting…" : "Submit report"}
    </button>
  );
}

export default function ReportForm({ phoneNumber }: { phoneNumber: string }) {
  const [state, formAction] = useActionState<ReportState, FormData>(
    submitReport,
    { ok: false, message: "" }
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="phone_number" value={phoneNumber} />

      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          name="is_spam"
          defaultChecked
          className="h-5 w-5 accent-canada"
        />
        <span className="text-sm font-medium text-zinc-700">
          This number is spam / unwanted
        </span>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-zinc-700">Type of call</span>
        <select
          name="type"
          defaultValue="Scam"
          className="rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-canada focus:ring-2 focus:ring-canada/30"
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-zinc-700">Comment</span>
        <textarea
          name="comment"
          rows={3}
          maxLength={1000}
          placeholder="What happened on the call?"
          className="rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-canada focus:ring-2 focus:ring-canada/30"
        />
      </label>

      <div className="flex items-center gap-3">
        <SubmitButton />
        {state.message && (
          <span
            className={`text-sm ${state.ok ? "text-green-600" : "text-canada"}`}
          >
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}
