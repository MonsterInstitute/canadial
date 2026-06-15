import Link from "next/link";
import { LOCALES } from "@/lib/i18n";

// Flag + native-name links to every language version. Used on the homepage
// and each language page (so there's always a path back to English).
export default function LanguageSwitcher({ current }: { current?: string }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-sm">
      {LOCALES.map((l) => {
        const active = l.code === current;
        return (
          <Link
            key={l.code}
            href={l.path}
            hrefLang={l.hreflang}
            className={
              active
                ? "font-semibold text-canada"
                : "text-zinc-600 hover:text-canada"
            }
          >
            <span className="mr-1" aria-hidden>
              {l.flag}
            </span>
            {l.nativeName}
          </Link>
        );
      })}
    </div>
  );
}
