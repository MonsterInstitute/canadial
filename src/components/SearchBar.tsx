"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { normalizePhone } from "@/lib/phone";

export default function SearchBar({ autoFocus = false }: { autoFocus?: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const normalized = normalizePhone(value);
    if (normalized.length !== 10) {
      setError("Please enter a valid 10-digit Canadian phone number.");
      return;
    }
    setError(null);
    router.push(`/lookup/${normalized}`);
  }

  return (
    <form onSubmit={onSubmit} className="w-full">
      <div className="flex w-full flex-col gap-3 sm:flex-row">
        <input
          type="tel"
          inputMode="tel"
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="(416) 555-1234"
          aria-label="Phone number"
          className="w-full flex-1 rounded-lg border border-zinc-300 px-4 py-3 text-lg shadow-sm outline-none focus:border-canada focus:ring-2 focus:ring-canada/30"
        />
        <button
          type="submit"
          className="rounded-lg bg-canada px-6 py-3 text-lg font-semibold text-white transition-colors hover:bg-red-700 active:bg-red-800"
        >
          Search
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-canada">{error}</p>}
    </form>
  );
}
