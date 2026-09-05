import type { Metadata } from "next";
import Link from "next/link";
import { LOCALES } from "@/lib/i18n";

// The /app section is a second, parallel interface: dark, mobile-first, and
// built around one question rather than the data-dense pages under /. It runs
// alongside the existing site and shares its root layout (and therefore its
// AdSense script). The data-app-shell marker below is what the :has() rules in
// globals.css key off to hide the site header and footer here.
//
// noindex is deliberate and load-bearing. /app/result/[number] shows the same
// facts as /lookup/[number]; letting both into the index would put the site in
// competition with itself for every one of ~307k numbers. The existing pages
// keep all the SEO. Remove the robots block only if /app replaces them.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
  title: {
    default: "Canadial — Who just called you?",
    template: "%s | Canadial",
  },
};

const LANGS = LOCALES.filter((l) => l.code !== "en");

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div
      data-app-shell
      className="flex min-h-screen flex-col bg-[#0a0a0a] text-white"
    >
      <header className="flex items-center justify-between px-5 py-4">
        <Link
          href="/app"
          className="flex items-center gap-2 text-lg font-semibold tracking-tight"
        >
          <span aria-hidden>🍁</span>
          <span>Canadial</span>
        </Link>

        {/* /app is English-only for now, so this points at the existing
            translated pages rather than pretending a translation exists. */}
        <details className="relative">
          <summary className="cursor-pointer list-none rounded-full border border-white/15 px-3 py-1.5 text-sm text-white/70 transition-colors hover:text-white [&::-webkit-details-marker]:hidden">
            EN
          </summary>
          <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-xl border border-white/10 bg-zinc-900 py-1 shadow-xl">
            {LANGS.map((l) => (
              <Link
                key={l.code}
                href={l.path}
                hrefLang={l.hreflang}
                className="block px-4 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white"
              >
                {l.flag} {l.nativeName}
              </Link>
            ))}
          </div>
        </details>
      </header>

      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
