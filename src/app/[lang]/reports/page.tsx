import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getReportableMonths } from "@/lib/reports";
import { REPORTS_CONTENT, getLocale, interp } from "@/lib/i18n";

export const revalidate = 604800; // weekly — matches src/app/reports/page.tsx

export function generateStaticParams() {
  return Object.keys(REPORTS_CONTENT).map((lang) => ({ lang }));
}

type Props = { params: Promise<{ lang: string }> };

function isSupported(lang: string) {
  const l = getLocale(lang);
  return !!l && l.code !== "en" && !!REPORTS_CONTENT[lang];
}

function localizedMonth(year: number, month: number, htmlLang: string): string {
  return new Intl.DateTimeFormat(htmlLang, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isSupported(lang)) return {};
  const t = REPORTS_CONTENT[lang];
  return {
    title: t.indexTitle,
    description: t.indexIntro,
    alternates: {
      canonical: `/${lang}/reports`,
      languages: {
        en: "/reports",
        "x-default": "/reports",
        ...Object.fromEntries(
          Object.keys(REPORTS_CONTENT).map((c) => [
            getLocale(c)!.hreflang,
            `/${c}/reports`,
          ])
        ),
      },
    },
  };
}

export default async function LangReportsIndex({ params }: Props) {
  const { lang } = await params;
  if (!isSupported(lang)) notFound();
  const loc = getLocale(lang)!;
  const t = REPORTS_CONTENT[lang];
  const months = await getReportableMonths();

  return (
    <div
      dir={loc.dir}
      lang={loc.htmlLang}
      className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14"
    >
      <header>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {t.indexTitle}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-zinc-700">{t.indexIntro}</p>
      </header>

      <section className="mt-10">
        {months.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-zinc-500">
            —
          </p>
        ) : (
          <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200">
            {months.map(({ year, month }) => {
              const mm = String(month).padStart(2, "0");
              const label = interp(t.reportTitle, {
                month: localizedMonth(year, month, loc.htmlLang),
              });
              return (
                <li key={`${year}-${mm}`}>
                  <Link
                    href={`/${lang}/reports/${year}/${mm}`}
                    className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-zinc-50"
                  >
                    <span className="font-semibold text-zinc-900">{label}</span>
                    <span aria-hidden className="text-canada">
                      →
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
