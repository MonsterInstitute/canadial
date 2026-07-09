"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { submitReport, type ReportState } from "@/app/lookup/[number]/actions";

const TYPES = ["Scam", "Telemarketer", "Robocall", "Debt Collector", "Other"];

export type ReportFormLabels = {
  isSpam: string;
  type: string;
  comment: string;
  commentPlaceholder: string;
  submit: string;
  submitting: string;
  success: string;
  error: string;
};

export const DEFAULT_LABELS: ReportFormLabels = {
  isSpam: "This number is spam / unwanted",
  type: "Type of call",
  comment: "Comment",
  commentPlaceholder: "What happened on the call?",
  submit: "Submit report",
  submitting: "Submitting…",
  success: "Thanks! Your report has been submitted.",
  error: "Could not save your report. Please try again.",
};

function SubmitButton({
  submit,
  submitting,
  prominent,
}: {
  submit: string;
  submitting: string;
  prominent?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={
        prominent
          ? "w-full rounded-xl bg-canada px-6 py-3.5 text-center text-base font-bold text-white shadow-sm transition-colors hover:bg-red-700 disabled:opacity-60 sm:w-auto sm:text-lg"
          : "rounded-lg bg-canada px-5 py-2.5 font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
      }
    >
      {pending ? submitting : submit}
    </button>
  );
}

export default function ReportForm({
  phoneNumber,
  labels,
  prominent,
}: {
  phoneNumber: string;
  labels?: ReportFormLabels;
  prominent?: boolean;
}) {
  const t = labels ?? DEFAULT_LABELS;
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
        <span className="text-sm font-medium text-zinc-700">{t.isSpam}</span>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-zinc-700">{t.type}</span>
        {/* Option values stay English (the canonical DB categories) */}
        <select
          name="type"
          defaultValue="Scam"
          className="rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-canada focus:ring-2 focus:ring-canada/30"
        >
          {TYPES.map((ty) => (
            <option key={ty} value={ty}>
              {ty}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-zinc-700">{t.comment}</span>
        <textarea
          name="comment"
          rows={3}
          maxLength={1000}
          placeholder={t.commentPlaceholder}
          className="rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-canada focus:ring-2 focus:ring-canada/30"
        />
      </label>

      <div
        className={
          prominent
            ? "flex flex-col items-stretch gap-2 sm:flex-row sm:items-center"
            : "flex items-center gap-3"
        }
      >
        <SubmitButton
          submit={t.submit}
          submitting={t.submitting}
          prominent={prominent}
        />
        {state.message && (
          <span
            className={`text-sm ${state.ok ? "text-green-600" : "text-canada"}`}
          >
            {state.ok ? t.success : t.error}
          </span>
        )}
      </div>
    </form>
  );
}
