import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LOCALES, getLocale } from "@/lib/i18n";
import { RIGHTS_CONTENT } from "@/lib/rights-content";

// Pre-render one per non-English locale.
export function generateStaticParams() {
  return LOCALES.filter((l) => l.code !== "en").map((l) => ({ lang: l.code }));
}

type Props = { params: Promise<{ lang: string }> };

function isSupportedLang(lang: string) {
  const loc = getLocale(lang);
  return !!loc && loc.code !== "en" && !!RIGHTS_CONTENT[lang];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isSupportedLang(lang)) return {};
  const t = RIGHTS_CONTENT[lang];
  return {
    title: t.pageTitle,
    description: t.pageDescription,
    alternates: {
      canonical: `/${lang}/rights`,
      languages: {
        en: "/rights",
        "x-default": "/rights",
        ...Object.fromEntries(
          LOCALES.filter((l) => l.code !== "en").map((l) => [
            l.hreflang,
            `/${l.code}/rights`,
          ])
        ),
      },
    },
  };
}

// Linkify phone numbers (kept in English) and the lnnte-dncl.gc.ca URL inside
// translated copy, so the numbers stay tappable and the DNL link works.
function RichText({ text }: { text: string }) {
  const parts = text.split(/(1-\d{3}-\d{3}-\d{4}|lnnte-dncl\.gc\.ca)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (/^1-\d{3}-\d{3}-\d{4}$/.test(part)) {
          return (
            <a
              key={i}
              href={`tel:+${part.replace(/\D/g, "")}`}
              className="font-semibold text-canada underline"
            >
              {part}
            </a>
          );
        }
        if (part === "lnnte-dncl.gc.ca") {
          return (
            <a
              key={i}
              href="https://lnnte-dncl.gc.ca/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-canada underline"
            >
              {part}
            </a>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

export default async function LangRightsPage({ params }: Props) {
  const { lang } = await params;
  if (!isSupportedLang(lang)) notFound();

  const loc = getLocale(lang)!;
  const t = RIGHTS_CONTENT[lang];

  return (
    <>
      <div
        dir={loc.dir}
        lang={loc.htmlLang}
        className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14"
      >
        <header>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t.pageTitle}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-zinc-700">{t.intro}</p>
        </header>

        {/* 1. CRA */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold tracking-tight">
            {t.craSection.title}
          </h2>
          <p className="mt-3 leading-relaxed text-zinc-700">
            {t.craSection.intro}
          </p>

          <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200">
            <table className="w-full text-start text-sm">
              <thead className="bg-zinc-50 text-zinc-700">
                <tr>
                  <th className="px-4 py-3 font-semibold text-start">
                    {t.craSection.tableHeaders[0]}
                  </th>
                  <th className="px-4 py-3 font-semibold text-start">
                    {t.craSection.tableHeaders[1]}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 align-top text-zinc-600">
                {t.craSection.tableRows.map((row, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3">{row[0]}</td>
                    <td className="px-4 py-3">{row[1]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="mt-6 font-semibold text-zinc-900">
            {t.craSection.neverTitle}
          </h3>
          <ul className="mt-2 list-disc space-y-1 ps-5 text-zinc-700">
            {t.craSection.neverList.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>

          <h3 className="mt-6 font-semibold text-zinc-900">
            {t.craSection.whatToDoTitle}
          </h3>
          <ol className="mt-2 list-decimal space-y-1 ps-5 text-zinc-700">
            {t.craSection.whatToDo.map((item, i) => (
              <li key={i}>
                <RichText text={item} />
              </li>
            ))}
          </ol>

          <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-5 text-blue-900">
            {t.craSection.closing}
          </div>
        </section>

        {/* 2. Debt collector */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold tracking-tight">
            {t.debtSection.title}
          </h2>
          <p className="mt-3 leading-relaxed text-zinc-700">
            {t.debtSection.intro}
          </p>

          <h3 className="mt-6 font-semibold text-zinc-900">
            {t.debtSection.rightsTitle}
          </h3>
          <ul className="mt-2 list-disc space-y-1 ps-5 text-zinc-700">
            {t.debtSection.rightsList.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>

          <h3 className="mt-6 font-semibold text-zinc-900">
            {t.debtSection.cannotTitle}
          </h3>
          <ul className="mt-2 list-disc space-y-1 ps-5 text-zinc-700">
            {t.debtSection.cannotList.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>

          <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-5 text-blue-900">
            <RichText text={t.debtSection.reportInfo} />
          </div>
        </section>

        {/* 3. Sales calls / DNC */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold tracking-tight">
            {t.dncSection.title}
          </h2>
          <p className="mt-3 leading-relaxed text-zinc-700">
            <RichText text={t.dncSection.body} />
          </p>
        </section>

        {/* 4. Scammed */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold tracking-tight">
            {t.scammedSection.title}
          </h2>
          <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-5 text-blue-900">
            {t.scammedSection.intro}
          </div>

          <h3 className="mt-6 font-semibold text-zinc-900">
            {t.scammedSection.stepsTitle}
          </h3>
          <ol className="mt-2 list-decimal space-y-1 ps-5 text-zinc-700">
            {t.scammedSection.stepsList.map((item, i) => (
              <li key={i}>
                <RichText text={item} />
              </li>
            ))}
          </ol>
        </section>

        <div className="mt-12 rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-center">
          <p className="text-zinc-700">{t.lookupCta.text}</p>
          <Link
            href={`/${lang}`}
            className="mt-4 inline-block rounded-lg bg-canada px-5 py-2.5 font-semibold text-white hover:bg-red-700"
          >
            {t.lookupCta.button}
          </Link>
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl px-4 pb-12">
        <Link
          href={`/${lang}`}
          className="text-sm font-medium text-canada hover:underline"
        >
          ← {loc.nativeName}
        </Link>
      </div>
    </>
  );
}
