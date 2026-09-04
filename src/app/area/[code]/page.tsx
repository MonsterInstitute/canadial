import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getAreaSummary } from "@/lib/spam";
import { AREA_CODES, regionForCode, codesForRegion } from "@/lib/area-codes";
import { provinceForAreaCode } from "@/lib/provinces";
import { formatPhone, cleanComment, isValidAreaCode } from "@/lib/phone";
import { SITE_NAME, SITE_URL } from "@/lib/config";
import SearchBar from "@/components/SearchBar";

// ISR: regenerate daily. Pre-render the well-known area codes at build time;
// any other 3-digit code still renders on demand.
export const revalidate = 86400;

// How many numbers this page lists. The summary's counts stay exact over the
// whole area code regardless — only the list is capped.
const LISTED_NUMBERS = 100;

// Shared between generateMetadata and the page render so we only aggregate the
// area code once per request.
const getSummary = cache((code: string) => getAreaSummary(code, LISTED_NUMBERS));

export function generateStaticParams() {
  return AREA_CODES.map((a) => ({ code: a.code }));
}

type Props = { params: Promise<{ code: string }> };

function isValidCode(code: string) {
  return isValidAreaCode(code);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  if (!isValidCode(code)) return {};
  const region = regionForCode(code);
  const province = provinceForAreaCode(code);
  const loc = region ? `${region}, ${province}` : province;

  const summary = await getSummary(code);
  const count = summary.numberCount;
  const topType = summary.topType;

  // `absolute` skips the root "%s | Canadial" template.
  const title = {
    absolute: `${code} Area Code Spam Calls — ${loc} | ${SITE_NAME}`,
  };

  const description =
    count > 0
      ? `Area code ${code} (${loc}): ${count} spam number${
          count === 1 ? "" : "s"
        } reported by Canadians.${
          topType ? ` Most common: ${topType}.` : ""
        } See all reported numbers.`
      : `Area code ${code} (${loc}): no spam numbers reported yet. Search any ${code} number to check if it is spam, a scam, or legitimate.`;

  return {
    title,
    description,
    alternates: { canonical: `/area/${code}` },
  };
}

export default async function AreaPage({ params }: Props) {
  const { code } = await params;
  if (!isValidCode(code)) notFound();

  const summary = await getSummary(code);
  // Exact over the whole area code; `numbers` is just the listed slice.
  const numberCount = summary.numberCount;
  const numbers = summary.topNumbers;
  const region = regionForCode(code);
  const province = provinceForAreaCode(code);
  const siblingCodeCount = region ? codesForRegion(region).length : 0;
  const otherCodes = AREA_CODES.filter((a) => a.code !== code).slice(0, 12);

  // Community stats. These come from the summary, so they cover every number
  // in the area code — not only the ones listed below.
  const reportTotal = summary.reportTotal;
  const topType = summary.topType;
  const typeCount = (t: string) => summary.typeCounts[t] ?? 0;

  // Visual breakdown of caller types across the area code. "Other" folds in
  // every category that isn't one of the three headline types (e.g. Debt
  // Collector, or numbers with no recorded type).
  const scamCount = typeCount("Scam");
  const teleCount = typeCount("Telemarketer");
  const roboCount = typeCount("Robocall");
  const otherCount = Math.max(
    0,
    numberCount - scamCount - teleCount - roboCount
  );
  const breakdown = [
    { label: "Scam", count: scamCount, color: "#d52b1e" },
    { label: "Telemarketer", count: teleCount, color: "#f59e0b" },
    { label: "Robocall", count: roboCount, color: "#7c3aed" },
    { label: "Other", count: otherCount, color: "#a1a1aa" },
  ];
  const breakdownTotal = numberCount;
  const pct = (n: number) =>
    breakdownTotal > 0 ? Math.round((n / breakdownTotal) * 100) : 0;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          {
            "@type": "ListItem",
            position: 2,
            name: `Area code ${code}`,
            item: `${SITE_URL}/area/${code}`,
          },
        ],
      },
      {
        "@type": "ItemList",
        name: `Reported numbers in the ${code} area code`,
        numberOfItems: numberCount,
        itemListElement: numbers.map((n, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: formatPhone(n.phone_number),
          url: `${SITE_URL}/lookup/${n.phone_number}`,
        })),
      },
    ],
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="text-sm text-zinc-500">
        <Link href="/" className="hover:text-canada">
          Home
        </Link>{" "}
        / <span className="text-zinc-700">Area code {code}</span>
      </nav>

      <header className="mt-3">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {code} spam calls
        </h1>
        <p className="mt-2 text-zinc-600">
          {numberCount > 0 ? (
            <>
              <strong>{numberCount}</strong> reported number
              {numberCount === 1 ? "" : "s"} in the {code} area code
              {region ? ` (${region})` : ""}. Tap a number to see reports and
              comments.
            </>
          ) : (
            <>
              No numbers reported in the {code} area code
              {region ? ` (${region})` : ""} yet.
            </>
          )}
        </p>
      </header>

      <section className="mt-5 text-sm leading-relaxed text-zinc-600">
        <p>
          {region ? (
            <>
              Area code {code} serves {region} in {province}, Canada.
              {siblingCodeCount > 1 ? (
                <>
                  {" "}
                  It is one of {siblingCodeCount} area codes serving this region.
                </>
              ) : null}{" "}
            </>
          ) : (
            <>Area code {code} is associated with {province}. </>
          )}
          {numberCount > 0 ? (
            <>
              Canadial has tracked {numberCount} reported spam number
              {numberCount === 1 ? "" : "s"} in this area code
              {topType ? (
                <>
                  , with <strong>{topType}</strong> being the most commonly
                  reported type
                </>
              ) : null}
              .
            </>
          ) : (
            <>
              Canadial has not tracked any reported spam numbers in this area
              code yet — search any {code} number above to check it.
            </>
          )}
        </p>
      </section>

      {numberCount > 0 && (
        <section className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50 p-5">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-600">
            <span>
              <strong className="text-zinc-900">{reportTotal}</strong> total
              reports
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
            Canadians in the {region ?? code} area have reported{" "}
            <strong>{numberCount}</strong> suspicious number
            {numberCount === 1 ? "" : "s"}.
            {topType ? (
              <>
                {" "}
                The most common type is <strong>{topType}</strong>.
              </>
            ) : null}{" "}
            Help your community by reporting calls you receive.
          </p>
        </section>
      )}

      {/* CSS-only visual breakdown of caller types in this area code. */}
      {numberCount > 0 && (
        <section className="mt-5">
          <h2 className="mb-3 text-sm font-semibold text-zinc-700">
            Reported types in the {code} area code
          </h2>
          <div className="flex h-4 w-full overflow-hidden rounded-full bg-zinc-100">
            {breakdown.map((s) =>
              s.count > 0 ? (
                <div
                  key={s.label}
                  className="h-full"
                  style={{
                    width: `${(s.count / breakdownTotal) * 100}%`,
                    backgroundColor: s.color,
                  }}
                  title={`${s.label}: ${s.count} (${pct(s.count)}%)`}
                />
              ) : null
            )}
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
            {breakdown.map((s) => (
              <li key={s.label} className="flex items-center gap-2">
                <span
                  className="h-3 w-3 shrink-0 rounded-sm"
                  style={{ backgroundColor: s.color }}
                  aria-hidden
                />
                <span className="text-zinc-600">
                  <span className="font-semibold text-zinc-900">{s.label}</span>{" "}
                  {pct(s.count)}%
                  <span className="text-zinc-400"> ({s.count})</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-5">
        <SearchBar />
      </div>

      {numberCount > 0 && (
        <ul className="mt-6 divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200">
          {numbers.map((n) => (
            <li key={n.phone_number}>
              <Link
                href={`/lookup/${n.phone_number}`}
                className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-zinc-50"
              >
                <div className="min-w-0">
                  <div className="font-medium text-zinc-900">
                    {formatPhone(n.phone_number)}
                  </div>
                  {n.latest_comment && (
                    <p className="truncate text-sm text-zinc-500">
                      {cleanComment(n.latest_comment)}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-canada">
                    {n.most_common_type || "Spam"}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {n.report_count} report{n.report_count === 1 ? "" : "s"}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-semibold text-zinc-700">
          Other area codes
        </h2>
        <div className="flex flex-wrap gap-2">
          {otherCodes.map((a) => (
            <Link
              key={a.code}
              href={`/area/${a.code}`}
              className="rounded-full border border-zinc-200 px-3 py-1 text-sm text-zinc-600 hover:border-canada hover:text-canada"
            >
              {a.code}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
