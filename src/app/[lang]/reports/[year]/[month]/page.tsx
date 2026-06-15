import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMonthlyReport } from "@/lib/reports";
import { formatPhone } from "@/lib/phone";
import { REPORTS_CONTENT, getLocale, interp } from "@/lib/i18n";
import { SITE_NAME, SITE_URL } from "@/lib/config";

export const revalidate = 86400;

type Props = { params: Promise<{ lang: string; year: string; month: string }> };

function isSupported(lang: string) {
  const l = getLocale(lang);
  return !!l && l.code !== "en" && !!REPORTS_CONTENT[lang];
}

function parse(yearStr: string, monthStr: string) {
  const year = Number(yearStr);
  const month = Number(monthStr);
  const valid =
    Number.isInteger(year) && year >= 2000 && year <= 2100 &&
    Number.isInteger(month) && month >= 1 && month <= 12;
  return { year, month, valid };
}

function localizedMonth(year: number, month: number, htmlLang: string): string {
  return new Intl.DateTimeFormat(htmlLang, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, year: ys, month: ms } = await params;
  const { year, month, valid } = parse(ys, ms);
  if (!isSupported(lang) || !valid) return {};
  const loc = getLocale(lang)!;
  const t = REPORTS_CONTENT[lang];
  const mm = String(month).padStart(2, "0");
  const title = interp(t.reportTitle, { month: localizedMonth(year, month, loc.htmlLang) });
  return {
    title,
    description: t.indexIntro,
    alternates: {
      canonical: `/${lang}/reports/${year}/${mm}`,
      languages: {
        en: `/reports/${year}/${mm}`,
        "x-default": `/reports/${year}/${mm}`,
        ...Object.fromEntries(
          Object.keys(REPORTS_CONTENT).map((c) => [
            getLocale(c)!.hreflang,
            `/${c}/reports/${year}/${mm}`,
          ])
        ),
      },
    },
  };
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 p-5">
      <div className="text-3xl font-bold tracking-tight text-zinc-900">{value}</div>
      <div className="mt-1 text-sm text-zinc-500">{label}</div>
    </div>
  );
}

export default async function LangMonthlyReport({ params }: Props) {
  const { lang, year: ys, month: ms } = await params;
  const { year, month, valid } = parse(ys, ms);
  if (!isSupported(lang) || !valid) notFound();

  const loc = getLocale(lang)!;
  const t = REPORTS_CONTENT[lang];
  const report = await getMonthlyReport(year, month);
  if (!report) notFound();

  const mm = String(month).padStart(2, "0");
  const monthLabel = localizedMonth(year, month, loc.htmlLang);
  const nf = (n: number) => n.toLocaleString(loc.htmlLang);
  const topTypePct = report.typeBreakdown.find((x) => x.type === report.topType)?.pct ?? 0;
  void topTypePct;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    inLanguage: loc.hreflang,
    headline: interp(t.reportTitle, { month: monthLabel }),
    datePublished: `${year}-${mm}-01`,
    dateModified: `${year}-${mm}-28`,
    author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/favicon.svg` },
    },
    mainEntityOfPage: `${SITE_URL}/${lang}/reports/${year}/${mm}`,
  };

  return (
    <div
      dir={loc.dir}
      lang={loc.htmlLang}
      className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="text-sm text-zinc-500">
        <Link href={`/${lang}/reports`} className="hover:text-canada">
          {t.backLabel}
        </Link>{" "}
        / <span className="text-zinc-700">{monthLabel}</span>
      </nav>

      {/* Hero */}
      <header className="mt-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {interp(t.reportTitle, { month: monthLabel })}
        </h1>
        <p className="mt-3 text-lg text-zinc-700">
          {interp(t.heroLine, { count: nf(report.monthNumbers) })}
        </p>
      </header>

      {/* Key stats */}
      <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat value={nf(report.totalNumbersAllTime)} label={t.statNumbers} />
        <Stat value={report.topType ?? "—"} label={t.statTopType} />
        <Stat value={report.topProvince ?? "—"} label={t.statTopProvince} />
        <Stat value={nf(report.newThisMonth)} label={t.statNew} />
      </section>

      <p className="mt-4 text-sm text-zinc-500">{t.baseline}</p>

      {/* Breakdown by type */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight">{t.secTypes}</h2>
        <div className="mt-4 space-y-3">
          {report.typeBreakdown.map((x) => (
            <div key={x.type}>
              <div className="flex justify-between text-sm">
                <span className="font-medium text-zinc-700">{x.type}</span>
                <span className="text-zinc-500">
                  {nf(x.count)} ({x.pct.toFixed(1)}%)
                </span>
              </div>
              <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-canada"
                  style={{ width: `${Math.max(x.pct, 1)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Top area codes */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight">{t.secAreaCodes}</h2>
        <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200">
          <table className="w-full text-start text-sm">
            <thead className="bg-zinc-50 text-zinc-700">
              <tr>
                <th className="px-4 py-3 text-start font-semibold">{t.thAreaCode}</th>
                <th className="px-4 py-3 text-start font-semibold">{t.thRegion}</th>
                <th className="px-4 py-3 text-end font-semibold">{t.thNumbers}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-zinc-600">
              {report.topAreaCodes.map((c) => (
                <tr key={c.code}>
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    <Link href={`/${lang}/area/${c.code}`} className="hover:text-canada">
                      {c.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{c.region}</td>
                  <td className="px-4 py-3 text-end">{nf(c.count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Province breakdown */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight">{t.secProvinces}</h2>
        <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200">
          <table className="w-full text-start text-sm">
            <thead className="bg-zinc-50 text-zinc-700">
              <tr>
                <th className="px-4 py-3 text-start font-semibold">{t.thProvince}</th>
                <th className="px-4 py-3 text-end font-semibold">{t.thNumbers}</th>
                <th className="px-4 py-3 text-end font-semibold">{t.thShare}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-zinc-600">
              {report.provinceBreakdown.map((p) => (
                <tr key={p.province}>
                  <td className="px-4 py-3 font-medium text-zinc-900">{p.province}</td>
                  <td className="px-4 py-3 text-end">{nf(p.count)}</td>
                  <td className="px-4 py-3 text-end">{p.pct.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Top numbers */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight">{t.secTopNumbers}</h2>
        <ul className="mt-4 divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200">
          {report.topNumbers.map((n) => (
            <li key={n.phone_number}>
              <Link
                href={`/${lang}/lookup/${n.phone_number}`}
                className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-zinc-50"
              >
                <span className="font-medium text-zinc-900">
                  {formatPhone(n.phone_number)}
                </span>
                <span className="flex items-center gap-3">
                  {n.type && (
                    <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-canada">
                      {n.type}
                    </span>
                  )}
                  <span className="text-sm text-zinc-400">
                    {nf(n.count)} {t.reportsUnit}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* What this means */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight">{t.secMeaning}</h2>
        <p className="mt-3 leading-relaxed text-zinc-700">
          {interp(t.meaning, {
            month: monthLabel,
            count: nf(report.monthNumbers),
            type: report.topType ?? "—",
            province: report.topProvince ?? "—",
          })}
        </p>
      </section>

      {/* Methodology */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight">{t.secMethodology}</h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-500">{t.methodology}</p>
      </section>

      {/* CTA */}
      <div className="mt-12 rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-center">
        <p className="text-zinc-700">{t.ctaText}</p>
        <Link
          href={`/${lang}`}
          className="mt-4 inline-block rounded-lg bg-canada px-5 py-2.5 font-semibold text-white hover:bg-red-700"
        >
          {t.ctaButton}
        </Link>
      </div>
    </div>
  );
}
