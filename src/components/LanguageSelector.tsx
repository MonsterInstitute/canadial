"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  LOCALES,
  getLocale,
  langFromPath,
  basePath,
  hasLanguageVariant,
  localizePath,
} from "@/lib/i18n";

const STORAGE_KEY = "canadial_lang";

export default function LanguageSelector() {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = langFromPath(pathname);
  const currentLoc = getLocale(current) ?? LOCALES[0];

  // Persisted preference: on a fresh page load, if the visitor's saved language
  // differs from this page's language, send them to the equivalent page. Only
  // for pages that have a language variant — never bounce English-only pages.
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored || stored === current || !getLocale(stored)) return;
    if (!hasLanguageVariant(basePath(pathname))) return;
    const target = localizePath(pathname, stored);
    if (target !== pathname) router.replace(target);
    // Run once on mount (full page load); intentionally no deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close the dropdown on outside click.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  function choose(code: string) {
    localStorage.setItem(STORAGE_KEY, code);
    setOpen(false);
    if (code !== current) router.push(localizePath(pathname, code));
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Change language"
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 py-1.5 text-sm font-medium text-zinc-700 hover:border-canada hover:text-canada"
      >
        <span aria-hidden>🌐</span>
        <span>{currentLoc.short}</span>
        <span aria-hidden className="text-xs text-zinc-400">
          ▾
        </span>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 z-50 mt-1 max-h-80 w-44 overflow-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg"
        >
          {LOCALES.map((l) => (
            <li key={l.code}>
              <button
                type="button"
                onClick={() => choose(l.code)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-50 ${
                  l.code === current ? "font-semibold text-canada" : "text-zinc-700"
                }`}
              >
                <span aria-hidden>{l.flag}</span>
                {l.nativeName}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
