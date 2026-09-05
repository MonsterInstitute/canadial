"use client";

import { useState } from "react";

// "Alert my family & friends". Uses the native share sheet where there is one
// (every phone, which is what this UI is for) and falls back to copying the
// link, so the button always does something rather than silently failing.
export default function ShareButton({
  phone,
  verdict,
  url,
}: {
  phone: string;
  verdict: string;
  url: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function onClick() {
    const text = `${phone} — ${verdict}. Check any Canadian number on Canadial.`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Canadial", text, url });
        return;
      } catch {
        // The user dismissed the sheet, or the browser refused. Fall through
        // to copying rather than reporting an error they didn't cause.
      }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setState("copied");
      setTimeout(() => setState("idle"), 2500);
    } catch {
      setState("failed");
      setTimeout(() => setState("idle"), 2500);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-2xl border border-white/12 bg-white/5 px-5 py-4 text-left transition-colors hover:bg-white/10 active:bg-white/15"
    >
      <span aria-hidden className="text-2xl">
        💬
      </span>
      <span className="flex-1">
        <span className="block font-semibold text-white">
          {state === "copied"
            ? "Copied — now paste it to them"
            : state === "failed"
              ? "Couldn't share — copy the link from your browser"
              : "Alert my family & friends"}
        </span>
        <span className="block text-sm text-white/50">
          Scammers often call the same people twice
        </span>
      </span>
    </button>
  );
}
