"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

const STORAGE_KEY = "canadial_new_ui_banner_dismissed";

// localStorage is an external store, so it's read through useSyncExternalStore
// rather than an effect that sets state on mount — that pattern causes a
// cascading render and React flags it.
//
// The server snapshot reports "dismissed" so the banner is absent from the
// static prerender that every visitor shares, and appears after hydration only
// for people who haven't dismissed it. The alternative — prerendering it open —
// would flash it back at everyone who already closed it.

let listeners: Array<() => void> = [];

function subscribe(onChange: () => void) {
  listeners.push(onChange);
  // Another tab dismissing it should hide it here too.
  window.addEventListener("storage", onChange);
  return () => {
    listeners = listeners.filter((l) => l !== onChange);
    window.removeEventListener("storage", onChange);
  };
}

function isDismissed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    // Private mode or blocked storage: show it, just don't remember.
    return false;
  }
}

function dismiss() {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // Nothing to persist to; it reappears next visit, which is acceptable.
  }
  for (const l of listeners) l();
}

export default function NewUiBanner() {
  const dismissed = useSyncExternalStore(subscribe, isDismissed, () => true);
  if (dismissed) return null;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm">
      <Link href="/app" className="flex-1 text-zinc-700 hover:text-canada">
        <span aria-hidden>✨</span> Try the new Canadial — one question, one
        answer <span className="font-medium text-canada">→</span>
      </Link>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 rounded-md px-2 py-1 text-lg leading-none text-zinc-400 transition-colors hover:bg-zinc-200 hover:text-zinc-600"
      >
        ×
      </button>
    </div>
  );
}
