import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMonthlyReport, getReportableMonths, monthName } from "@/lib/reports";
import { formatPhone } from "@/lib/phone";
import { SITE_NAME, SITE_URL } from "@/lib/config";

export const revalidate = 86400; // daily

type Props = { params: Promise<{ year: string; month: string }> };

export async function generateStaticParams() {
  const months = await getReportableMonths();
  return months.map(({ year, month }) => ({
    year: String(year),
    month: String(month).padStart(2, "0"),
  }));
}

function parse(yearStr: string, monthStr: string) {
  const year = Number(yearStr);
  const month = Number(monthStr);
  const valid =
    Number.isInteger(year) &&
    year >= 2000 &&
    year <= 2100 &&
    Number.isInteger(month) &&
    month >= 1 &&
    month <= 12;
  return { year, month, valid };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { year: ys, month: ms } = await params;
  const { year, month, valid } = parse(ys, ms);
  if (!valid) return {};
  const label = monthName(year, month);
  const report = await getMonthlyReport(year, month);
  const count = report?.monthNumbers ?? 0;
  const mm = String(month).padStart(2, "0");
  return {
    title: `${label} Canadian Spam Call Report`,
    description: `${count.toLocaleString(
      "en-CA"
    )} spam numbers reported in Canada in ${label}. CRA scams, robocalls, and telemarketers — monthly data from ${SITE_NAME}'s community database.`,
    alternates: { canonical: `/reports/${year}/${mm}` },
  };
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 p-5">
      <div className="text-3xl font-bold tracking-tight text-zinc-900">
        {value}
      </div>
      <div className="mt-1 text-sm text-zinc-500">{label}</div>
    </div>
  );
}

export default async function MonthlyReportPage({ params }: Props) {
  const { year: ys, month: ms } = await params;
  const { year, month, valid } = parse(ys, ms);
  if (!valid) notFound();

  const report = await getMonthlyReport(year, month);
  if (!report) notFound();

  const mm = String(month).padStart(2, "0");
  const nf = (n: number) => n.toLocaleString("en-CA");
  const topTypePct =
    report.typeBreakdown.find((t) => t.type === report.topType)?.pct ?? 0;
  const topProvincePct =
    report.provinceBreakdown.find((p) => p.province === report.topProvince)?.pct ??
    0;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${report.label} Canadian Spam Call Report`,
    description: `${nf(report.monthNumbers)} spam numbers reported in Canada in ${report.label}.`,
    datePublished: `${year}-${mm}-01`,
    dateModified: `${year}-${mm}-28`,
    author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/favicon.svg` },
    },
    mainEntityOfPage: `${SITE_URL}/reports/${year}/${mm}`,
    isAccessibleForFree: true,
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="text-sm text-zinc-500">
        <Link href="/reports" className="hover:text-canada">
          Reports
        </Link>{" "}
        / <span className="text-zinc-700">{report.label}</span>
      </nav>

      {/* 1. Hero */}
      <header className="mt-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {report.label} Canadian Spam Call Report
        </h1>
        <p className="mt-3 text-lg text-zinc-700">
          {nf(report.monthNumbers)} spam numbers reported across Canada.
        </p>
      </header>

      {/* 2. Key stats */}
      <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat value={nf(report.totalNumbersAllTime)} label="Numbers in database" />
        <Stat value={report.topType ?? "—"} label="Most active scam type" />
        <Stat value={report.topProvince ?? "—"} label="Most targeted province" />
        <Stat value={nf(report.newThisMonth)} label="New numbers this month" />
      </section>

      {/* month-over-month */}
      <p className="mt-4 text-sm text-zinc-500">
        {report.pctChange === null ? (
          <>
            This is the first published report — there is no prior month to
            compare against yet.
          </>
        ) : (
          <>
            That is a {report.pctChange >= 0 ? "+" : ""}
            {report.pctChange.toFixed(1)}% change versus the previous month (
            {nf(report.prevMonthNumbers ?? 0)} numbers).
          </>
        )}
      </p>

      {/* 3. Breakdown by call type */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight">Breakdown by call type</h2>
        <div className="mt-4 space-y-3">
          {report.typeBreakdown.map((t) => (
            <div key={t.type}>
              <div className="flex justify-between text-sm">
                <span className="font-medium text-zinc-700">{t.type}</span>
                <span className="text-zinc-500">
                  {nf(t.count)} ({t.pct.toFixed(1)}%)
                </span>
              </div>
              <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-canada"
                  style={{ width: `${Math.max(t.pct, 1)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Top area codes */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight">
          Top 10 most-reported area codes
        </h2>
        <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-zinc-700">
              <tr>
                <th className="px-4 py-3 font-semibold">Area code</th>
                <th className="px-4 py-3 font-semibold">Region</th>
                <th className="px-4 py-3 text-right font-semibold">Numbers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-zinc-600">
              {report.topAreaCodes.map((c) => (
                <tr key={c.code}>
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    <Link href={`/area/${c.code}`} className="hover:text-canada">
                      {c.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{c.region}</td>
                  <td className="px-4 py-3 text-right">{nf(c.count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 5. Province breakdown */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight">
          Province-level breakdown
        </h2>
        <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-zinc-700">
              <tr>
                <th className="px-4 py-3 font-semibold">Province / region</th>
                <th className="px-4 py-3 text-right font-semibold">Numbers</th>
                <th className="px-4 py-3 text-right font-semibold">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-zinc-600">
              {report.provinceBreakdown.map((p) => (
                <tr key={p.province}>
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    {p.province}
                  </td>
                  <td className="px-4 py-3 text-right">{nf(p.count)}</td>
                  <td className="px-4 py-3 text-right">{p.pct.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 6. Top reported numbers */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight">
          Most-reported numbers this month
        </h2>
        <ul className="mt-4 divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200">
          {report.topNumbers.map((n) => (
            <li key={n.phone_number}>
              <Link
                href={`/lookup/${n.phone_number}`}
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
                    {nf(n.count)} report{n.count === 1 ? "" : "s"}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* 7. What this means */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight">What this means</h2>
        <p className="mt-3 leading-relaxed text-zinc-700">
          In {report.label}, Canadial recorded{" "}
          <strong>{nf(report.monthNumbers)}</strong> reported phone numbers
          across Canada.{" "}
          {report.topType && (
            <>
              The most-reported caller type was <strong>{report.topType}</strong>,
              making up {topTypePct.toFixed(1)}% of all reports.{" "}
            </>
          )}
          {report.topProvince && (
            <>
              Reports were most concentrated in <strong>{report.topProvince}</strong>
              {topProvincePct > 0 ? ` (${topProvincePct.toFixed(1)}% of numbers)` : ""}.{" "}
            </>
          )}
          {report.pctChange === null
            ? "As this is our first monthly report, it serves as a baseline for tracking trends going forward."
            : "We will continue tracking how these patterns shift month over month."}
        </p>
      </section>

      {/* 8. Methodology */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight">Methodology</h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-500">
          Figures are drawn from community reports submitted to Canadial.com.
          Numbers are grouped by their three-digit area code to estimate
          province-level activity; caller-type categories reflect how reporters
          classified each call. These are community-sourced reports, not a
          statistical sample of all Canadian phone traffic. Updated monthly.
        </p>
      </section>

      {/* 9. CTA */}
      <div className="mt-12 rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-center">
        <p className="text-zinc-700">
          Received a suspicious call? Report it to help protect other Canadians.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-lg bg-canada px-5 py-2.5 font-semibold text-white hover:bg-red-700"
        >
          Report a spam number
        </Link>
      </div>
    </div>
  );
}
