"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { submitReport, type ReportState } from "@/app/lookup/[number]/actions";

// A short comment, one tap away right under the verdict: the box is always on
// the page, so tapping it focuses it (and opens the keyboard) directly. It
// posts a community report through the same action as the full form below.
// Choosing a call type is optional; without one it is recorded like the full
// form's default, as unwanted, type "Other".

const TYPES = [
  { label: "Scam", type: "Scam", spam: true },
  { label: "Sales call", type: "Telemarketer", spam: true },
  { label: "Robocall", type: "Robocall", spam: true },
  { label: "Debt collector", type: "Debt Collector", spam: true },
  { label: "Not spam", type: "Other", spam: false },
];

function Post({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || disabled} className="rounded-lg bg-canada px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
      {pending ? "Posting…" : "Post comment"}
    </button>
  );
}

export default function QuickComment({ phone, pretty }: { phone: string; pretty: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [label, setLabel] = useState<string | null>(null);
  const [state, action] = useActionState<ReportState, FormData>(async (prev, form) => {
    const r = await submitReport(prev, form);
    if (r.ok) {
      setText("");
      setLabel(null);
      setOpen(false);
      router.refresh();
    }
    return r;
  }, { ok: false, message: "" });
  const chosen = TYPES.find((t) => t.label === label);

  return (
    <form action={action} className="mt-3 rounded-xl border border-zinc-200 p-3">
      <input type="hidden" name="phone_number" value={phone} />
      <input type="hidden" name="type" value={chosen?.type ?? "Other"} />
      {(chosen?.spam ?? true) && <input type="hidden" name="is_spam" value="on" />}
      <label className="block">
        <span className="sr-only">Comment about {pretty}</span>
        <textarea
          name="comment"
          rows={open ? 3 : 1}
          maxLength={1000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={`Got a call from ${pretty}? Say what it was about`}
          className="w-full resize-none rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-canada focus:ring-2 focus:ring-canada/30"
        />
      </label>
      {open && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {TYPES.map((t) => (
            <button
              key={t.label}
              type="button"
              aria-pressed={label === t.label}
              onClick={() => setLabel(label === t.label ? null : t.label)}
              className={`rounded-full border px-3 py-1 text-xs ${label === t.label ? "border-canada bg-canada text-white" : "border-zinc-300 hover:bg-zinc-50"}`}
            >
              {t.label}
            </button>
          ))}
          <span className="grow" />
          <Post disabled={text.trim().length < 3} />
        </div>
      )}
      {state.message && (
        <p className={`mt-2 text-xs ${state.ok ? "text-green-700" : "text-canada"}`}>
          {state.ok ? "Thanks — your comment is posted under Recent community reports." : "Could not post your comment. Please try again."}
        </p>
      )}
    </form>
  );
}
