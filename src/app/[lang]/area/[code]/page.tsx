import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getNumbersForAreaCode } from "@/lib/spam";
import { AREA_CODES, regionForCode } from "@/lib/area-codes";
import { AREA_CONTENT, CONTENT, LOOKUP_CONTENT, getLocale, interp } from "@/lib/i18n";
import { formatPhone } from "@/lib/phone";
import { SITE_URL } from "@/lib/config";
import SearchBar from "@/components/SearchBar";

// ISR: regenerate daily (see src/app/area/[code]/page.tsx for the English page).
export const revalidate = 86400;

type Props = { params: Promise<{ lang: string; code: string }> };

function isValidCode(code: string) {
  return /^\d{3}$/.test(code);
}
function isSupportedLang(lang: string) {
  const loc = getLocale(lang);
  return !!loc && loc.code !== "en" && !!AREA_CONTENT[lang];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, code } = await params;
  if (!isSupportedLang(lang) || !isValidCode(code)) return {};
  const a = AREA_CONTENT[lang];
  return {
    title: interp(a.title, { code }),
    description: interp(a.description, { code }),
    alternates: {
      canonical: `/${lang}/area/${code}`,
      languages: {
        en: `/area/${code}`,
        "x-default": `/area/${code}`,
        ...Object.fromEntries(
          Object.keys(AREA_CONTENT).map((c) => {
            const loc = getLocale(c)!;
            return [loc.hreflang, `/${c}/area/${code}`];
          })
        ),
      },
    },
  };
}

export default async function LangAreaPage({ params }: Props) {
  const { lang, code } = await params;
  if (!isSupportedLang(lang) || !isValidCode(code)) notFound();

  const loc = getLocale(lang)!;
  const a = AREA_CONTENT[lang];
  const backLabel = LOOKUP_CONTENT[lang].backToSearch;

  const numbers = await getNumbersForAreaCode(code);
  const region = regionForCode(code);
  const otherCodes = AREA_CODES.filter((x) => x.code !== code).slice(0, 12);

  const reportTotal = numbers.reduce((s, n) => s + n.report_count, 0);
  const typeBuckets: Record<string, number> = {};
  for (const n of numbers) {
    const ty = n.most_common_type || "Other";
    typeBuckets[ty] = (typeBuckets[ty] ?? 0) + 1;
  }
  const topType =
    Object.entries(typeBuckets).sort((x, y) => y[1] - x[1])[0]?.[0] ?? null;
  const typeCount = (ty: string) => typeBuckets[ty] ?? 0;

  return (
    <div
      dir={loc.dir}
      lang={loc.htmlLang}
      className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12"
    >
      <nav className="text-sm text-zinc-500">
        <Link href={`/${lang}`} className="hover:text-canada">
          {loc.nativeName}
        </Link>{" "}
        / <span className="text-zinc-700">{code}</span>
      </nav>

      <header className="mt-3">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {interp(a.title, { code })}
        </h1>
        {numbers.length === 0 && (
          <p className="mt-2 text-zinc-600">{interp(a.noNumbers, { code })}</p>
        )}
      </header>

      {numbers.length > 0 && (
        <section className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50 p-5">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-600">
            <span>
              <strong className="text-zinc-900">{reportTotal}</strong>{" "}
              {a.totalReports}
            </span>
            <span>
              <strong className="text-canada">{typeCount("Scam")}</strong> Scams
            </span>
            <span>
              <strong className="text-canada">{typeCount("Telemarketer")}</strong>{" "}
              Telemarketers
            </span>
            <span>
              <strong className="text-canada">{typeCount("Robocall")}</strong>{" "}
              Robocalls
            </span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">
            {interp(a.summary, {
              region: region ?? code,
              count: numbers.length,
              type: topType ?? "",
            })}
          </p>
        </section>
      )}

      <div className="mt-5">
        <SearchBar lang={lang} buttonLabel={CONTENT[lang].searchButton} />
      </div>

      {numbers.length > 0 && (
        <ul className="mt-6 divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200">
          {numbers.map((n) => (
            <li key={n.phone_number}>
              <Link
                href={`/${lang}/lookup/${n.phone_number}`}
                className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-zinc-50"
              >
                <div className="min-w-0">
                  <div className="font-medium text-zinc-900">
                    {formatPhone(n.phone_number)}
                  </div>
                  {n.latest_comment && (
                    <p className="truncate text-sm text-zinc-500">
                      {n.latest_comment}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-canada">
                    {n.most_common_type || "Spam"}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {n.report_count} {a.reports}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-semibold text-zinc-700">
          {a.otherAreaCodes}
        </h2>
        <div className="flex flex-wrap gap-2">
          {otherCodes.map((x) => (
            <Link
              key={x.code}
              href={`/${lang}/area/${x.code}`}
              className="rounded-full border border-zinc-200 px-3 py-1 text-sm text-zinc-600 hover:border-canada hover:text-canada"
            >
              {x.code}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <Link
          href={`/${lang}`}
          className="text-sm font-medium text-canada hover:underline"
        >
          ← {backLabel}
        </Link>
      </section>
    </div>
  );
}
