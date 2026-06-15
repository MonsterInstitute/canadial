import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import SloganRotator from "@/components/SloganRotator";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { CONTENT, getLocale } from "@/lib/i18n";

// Shared layout for every non-English landing page. Content is driven entirely
// by the locale's entry in CONTENT, so each route file is a thin wrapper.
export default function LanguagePage({ code }: { code: string }) {
  const loc = getLocale(code);
  const t = CONTENT[code];
  if (!loc || !t) return null;

  return (
    <div
      dir={loc.dir}
      lang={loc.htmlLang}
      className="mx-auto w-full max-w-3xl px-4"
    >
      <section className="flex flex-col items-center py-14 text-center sm:py-20">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-canada">
          <span aria-hidden>🍁 {loc.flag}</span> {loc.nativeName}
        </div>
        <h1 className="mb-3 max-w-2xl text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          {t.heading}
        </h1>
        {/* Slogans stay in English by design */}
        <SloganRotator className="mb-6 h-6 font-medium text-canada" />
        <p className="mb-8 max-w-xl text-zinc-600">{t.intro}</p>
        <div className="w-full max-w-xl">
          <SearchBar buttonLabel={t.searchButton} />
        </div>
        <div className="mt-6">
          <LanguageSwitcher current={code} />
        </div>
      </section>

      {/* Community-specific scam warning */}
      <section className="pb-8">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 text-blue-900">
          <h2 className="font-semibold">{t.scamTitle}</h2>
          <p className="mt-1.5 text-sm leading-relaxed">{t.scamBody}</p>
        </div>
      </section>

      {/* Know Your Rights (translated) */}
      <section className="pb-10">
        <h2 className="mb-3 text-xl font-semibold text-zinc-900">
          {t.rightsTitle}
        </h2>
        <ul className="list-disc space-y-2 ps-5 text-zinc-700">
          {t.rights.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </section>

      <section className="pb-12">
        <Link
          href="/"
          hrefLang="en"
          className="text-sm font-medium text-canada hover:underline"
        >
          {t.backToEnglish} →
        </Link>
      </section>
    </div>
  );
}
