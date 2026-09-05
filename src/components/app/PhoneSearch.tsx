"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { normalizePhone } from "@/lib/phone";

// The one input the /app home is built around. Deliberately not the shared
// SearchBar: that one is styled for the light site and routes to /lookup.
export default function PhoneSearch() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const normalized = normalizePhone(value);
    if (normalized.length !== 10) {
      setError("That's not a 10-digit Canadian number. Try again.");
      return;
    }
    setError(null);
    setBusy(true);
    router.push(`/app/result/${normalized}`);
  }

  return (
    <form onSubmit={onSubmit} className="w-full">
      <input
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          if (error) setError(null);
        }}
        placeholder="(416) 555 · 1234"
        aria-label="Phone number"
        className="w-full rounded-2xl border border-white/15 bg-white/5 px-5 py-5 text-center text-2xl font-semibold tracking-wide text-white outline-none transition-colors placeholder:font-normal placeholder:text-white/25 focus:border-white/40 focus:bg-white/10 sm:text-3xl"
      />

      {error && (
        <p role="alert" className="mt-3 text-center text-sm text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-4 w-full rounded-2xl bg-white px-6 py-4 text-lg font-semibold text-zinc-950 transition-colors hover:bg-white/90 active:bg-white/80 disabled:opacity-60"
      >
        {busy ? "Checking…" : "Check this number →"}
      </button>
    </form>
  );
}
