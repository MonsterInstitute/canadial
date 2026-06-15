import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getNumbersForAreaCode } from "@/lib/spam";
import { AREA_CODES, regionForCode } from "@/lib/area-codes";
import { formatPhone } from "@/lib/phone";
import { SITE_NAME, SITE_URL } from "@/lib/config";
import SearchBar from "@/components/SearchBar";

// ISR: regenerate hourly. Pre-render the well-known area codes at build time;
// any other 3-digit code still renders on demand.
export const revalidate = 3600;

export function generateStaticParams() {
  return AREA_CODES.map((a) => ({ code: a.code }));
}

type Props = { params: Promise<{ code: string }> };

function isValidCode(code: string) {
  return /^\d{3}$/.test(code);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  if (!isValidCode(code)) return {};
  const region = regionForCode(code);
  return {
    title: `${code} spam calls — who is calling from ${code}?`,
    description: `Reported spam, scam, and robocall numbers in the ${code} area code${
      region ? ` (${region})` : ""
    }. See who's calling and read community reports on ${SITE_NAME}.`,
    alternates: { canonical: `/area/${code}` },
  };
}

export default async function AreaPage({ params }: Props) {
  const { code } = await params;
  if (!isValidCode(code)) notFound();

  const numbers = await getNumbersForAreaCode(code);
  const region = regionForCode(code);
  const otherCodes = AREA_CODES.filter((a) => a.code !== code).slice(0, 12);

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
        numberOfItems: numbers.length,
        itemListElement: numbers.slice(0, 100).map((n, i) => ({
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
          {numbers.length > 0 ? (
            <>
              <strong>{numbers.length}</strong> reported number
              {numbers.length === 1 ? "" : "s"} in the {code} area code
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

      <div className="mt-5">
        <SearchBar />
      </div>

      {numbers.length > 0 && (
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
                      {n.latest_comment}
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
