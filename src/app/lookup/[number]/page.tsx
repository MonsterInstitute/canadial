import type { Metadata } from "next";
import Link from "next/link";
import { lookupPhone, formatPhone, normalizePhone } from "@/lib/lookup";
import { getNumbersForAreaCode, type AreaNumber } from "@/lib/spam";
import { regionForCode } from "@/lib/area-codes";
import { provinceForAreaCode } from "@/lib/provinces";
import { SITE_URL } from "@/lib/config";
import ReportForm from "@/components/ReportForm";
import AdUnit from "@/components/AdUnit";

// Cache each number page and regenerate hourly — keeps crawls cheap.
export const revalidate = 3600;

type Props = { params: Promise<{ number: string }> };

type LookupResult = Awaited<ReturnType<typeof lookupPhone>>;

// Schema.org structured data: a breadcrumb plus an FAQ-style Q&A that mirrors
// the page's verdict, for rich results. The extra location questions give Google
// more indexable content even when a number has few or no reports.
function buildJsonLd(number: string, pretty: string, result: LookupResult) {
  const code = number.slice(0, 3);
  const url = `${SITE_URL}/lookup/${number}`;
  const region = regionForCode(code);
  const province = provinceForAreaCode(code);

  let verdict: string;
  if (result.type === "legitimate") {
    const name = result.data?.name ? ` belonging to ${result.data.name}` : "";
    verdict = `${pretty} is a verified, legitimate phone number${name}.`;
  } else if (result.type === "spam") {
    const kind = result.data.most_common_type
      ? ` as ${result.data.most_common_type}`
      : "";
    verdict = `${pretty} has been reported ${result.data.report_count} time${
      result.data.report_count === 1 ? "" : "s"
    }${kind} and is likely spam or an unwanted call. Don't call back or share personal information.`;
  } else {
    verdict = `There are no spam or scam reports for ${pretty} yet. Always stay cautious with unexpected calls.`;
  }

  const locationAnswer = region
    ? `${pretty} uses the ${code} area code, which serves ${region} in ${province}, Canada.`
    : `${pretty} uses the ${code} area code in ${province}, Canada.`;

  const faq = [
    { q: `Is ${pretty} spam?`, a: verdict },
    { q: `Is ${pretty} a scam?`, a: verdict },
    {
      q: `What area code is ${pretty}?`,
      a: `${pretty} belongs to the ${code} area code${
        region ? `, which covers ${region}` : ""
      }.`,
    },
    { q: `Where is ${pretty} located?`, a: locationAnswer },
  ];

  return {
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
          { "@type": "ListItem", position: 3, name: pretty, item: url },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: faq.map(({ q, a }) => ({
          "@type": "Question",
          name: q,
          acceptedAnswer: { "@type": "Answer", text: a },
        })),
      },
    ],
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { number } = await params;
  const pretty = formatPhone(number);
  return {
    title: `Is ${pretty} spam?`,
    description: `Find out who called from ${pretty}. See spam reports, caller type, and community comments on Canadial.`,
    alternates: { canonical: `/lookup/${normalizePhone(number)}` },
  };
}

function Badge({
  color,
  label,
}: {
  color: "green" | "red" | "grey";
  label: string;
}) {
  const styles = {
    green: "bg-green-100 text-green-800 ring-green-600/20",
    red: "bg-red-100 text-canada ring-red-600/20",
    grey: "bg-zinc-100 text-zinc-700 ring-zinc-500/20",
  }[color];
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ring-1 ring-inset ${styles}`}
    >
      {label}
    </span>
  );
}

// Warm, non-judgmental reassurance shown below the badge for spam numbers.
function ReassuranceBox({
  tone,
  title,
  children,
}: {
  tone: "blue" | "grey";
  title: string;
  children: React.ReactNode;
}) {
  const styles =
    tone === "blue"
      ? "bg-blue-50 border-blue-200 text-blue-900"
      : "bg-zinc-50 border-zinc-200 text-zinc-700";
  return (
    <div className={`mt-4 rounded-xl border p-5 ${styles}`}>
      <p className="font-semibold leading-snug">{title}</p>
      <p className="mt-1.5 text-sm leading-relaxed">{children}</p>
    </div>
  );
}

function Reassurance({
  reports,
  mostCommonType,
}: {
  reports: { type?: string | null; comment?: string | null }[];
  mostCommonType: string | null;
}) {
  const types = new Set(
    [mostCommonType, ...reports.map((r) => r.type)].filter(Boolean) as string[]
  );
  const commentText = reports
    .map((r) => r.comment ?? "")
    .join(" ")
    .toLowerCase();

  const isCraScam = types.has("Scam") && /cra|tax|arrest/.test(commentText);
  const isDebt = types.has("Debt Collector");
  const isTelemarketer = !isCraScam && !isDebt && types.has("Telemarketer");

  if (isCraScam) {
    return (
      <ReassuranceBox tone="blue" title="Take a breath — this is a known scam. 🍁">
        Real CRA agents never threaten arrest, never ask for gift cards, and
        never demand immediate payment over the phone. If you&apos;re worried
        about your taxes, call CRA directly at{" "}
        <a className="font-semibold underline" href="tel:+18009598281">
          1-800-959-8281
        </a>
        . You are not in trouble.
      </ReassuranceBox>
    );
  }
  if (isDebt) {
    return (
      <ReassuranceBox
        tone="blue"
        title="You have rights. Canadian law protects you. 🍁"
      >
        Debt collectors cannot threaten you, call before 7am or after 9pm, or
        contact your employer. You don&apos;t have to face this alone. Learn
        about your rights at the{" "}
        <a
          className="font-semibold underline"
          href="https://www.canada.ca/en/financial-consumer-agency.html"
          target="_blank"
          rel="noopener noreferrer"
        >
          Financial Consumer Agency of Canada
        </a>
        .
      </ReassuranceBox>
    );
  }
  if (isTelemarketer) {
    return (
      <ReassuranceBox
        tone="grey"
        title="Tired of unwanted calls? You can stop most of them for free."
      >
        Register your number at{" "}
        <a
          className="font-semibold underline"
          href="https://lnnte-dncl.gc.ca/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Canada&apos;s Do Not Call List
        </a>{" "}
        — it only takes 2 minutes and it&apos;s free.
      </ReassuranceBox>
    );
  }
  return (
    <ReassuranceBox
      tone="grey"
      title="Don't call back. Don't press any numbers."
    >
      If this call made you worried, you&apos;re not alone — millions of
      Canadians receive scam calls every year. Report it below to protect
      others.
    </ReassuranceBox>
  );
}

// Format an ISO timestamp as a short, human date (e.g. "Jun 12, 2026").
function formatReportDate(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// A compact list of other reported numbers in the same area code, with a link
// through to the full area-code page. Used on both spam and unknown numbers so
// every lookup page has substantive, internally-linked content.
function RelatedNumbers({
  related,
  code,
  region,
  title,
  intro,
}: {
  related: AreaNumber[];
  code: string;
  region: string | null;
  title: string;
  intro: string;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-zinc-600">{intro}</p>
      {related.length > 0 ? (
        <ul className="mt-3 divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200">
          {related.map((n) => (
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
      ) : (
        <p className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
          No other numbers have been reported in the {code} area code yet.
        </p>
      )}
      <Link
        href={`/area/${code}`}
        className="mt-3 inline-block text-sm font-medium text-canada hover:underline"
      >
        See all reported numbers in area code {code}
        {region ? ` (${region})` : ""} →
      </Link>
    </section>
  );
}

// Area-code facts plus generic spam-spotting tips. Shown for numbers with no
// reports so the page still carries useful, indexable content.
function AreaInfoAndTips({
  pretty,
  code,
  region,
  province,
}: {
  pretty: string;
  code: string;
  region: string | null;
  province: string;
}) {
  return (
    <>
      <section className="mt-6 rounded-xl border border-zinc-200 p-5">
        <h2 className="text-lg font-semibold">About the {code} area code</h2>
        <dl className="mt-3 grid grid-cols-1 gap-1 text-sm text-zinc-600 sm:grid-cols-2">
          <div>
            <dt className="inline font-medium text-zinc-700">Area code: </dt>
            <dd className="inline">{code}</dd>
          </div>
          {region && (
            <div>
              <dt className="inline font-medium text-zinc-700">Region: </dt>
              <dd className="inline">{region}</dd>
            </div>
          )}
          <div>
            <dt className="inline font-medium text-zinc-700">Province: </dt>
            <dd className="inline">{province}</dd>
          </div>
          <div>
            <dt className="inline font-medium text-zinc-700">Country: </dt>
            <dd className="inline">Canada 🍁</dd>
          </div>
        </dl>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">
          {pretty} is a Canadian phone number in the {code} area code
          {region ? `, which serves ${region}` : ""}. Numbers in this area code
          are based in {province}. Browse the{" "}
          <Link
            href={`/area/${code}`}
            className="font-medium text-canada hover:underline"
          >
            {code} area code page
          </Link>{" "}
          to see which numbers nearby have been reported for spam or scams.
        </p>
      </section>

      <section className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-5">
        <h2 className="text-lg font-semibold">How to spot a spam or scam call</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-zinc-700">
          <li>
            Real organizations — including the CRA, banks, and police — never
            threaten arrest or demand immediate payment in gift cards or
            e-transfers over the phone.
          </li>
          <li>
            Scammers often spoof a local number, so a familiar area code like{" "}
            {code} does not guarantee the caller is who they claim to be.
          </li>
          <li>
            If you didn&apos;t recognize the number, let it go to voicemail — a
            legitimate caller will leave a message.
          </li>
          <li>
            Never press a button to &quot;opt out&quot; of a robocall; it only
            confirms your line is active and invites more calls.
          </li>
          <li>
            If a call feels suspicious, hang up and call the organization back
            using a number from their official website.
          </li>
        </ul>
      </section>
    </>
  );
}

export default async function LookupPage({ params }: Props) {
  const { number } = await params;
  const pretty = formatPhone(number);
  const result = await lookupPhone(number);

  if (result.type === "invalid") {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16 text-center">
        <Badge color="grey" label="Invalid number" />
        <h1 className="mt-4 text-2xl font-bold">That doesn&apos;t look right</h1>
        <p className="mt-2 text-zinc-600">
          &quot;{number}&quot; isn&apos;t a valid 10-digit Canadian phone number.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-canada px-5 py-2.5 font-semibold text-white hover:bg-red-700"
        >
          Back to search
        </Link>
      </div>
    );
  }

  const normalized = normalizePhone(number);
  const jsonLd = buildJsonLd(normalized, pretty, result);

  // Area-code context, shown on every (valid) number so even thin pages carry
  // real information. Related numbers power internal links to the area page.
  const code = normalized.slice(0, 3);
  const region = regionForCode(code);
  const province = provinceForAreaCode(code);

  // Other reported numbers in the same area code (excluding this one). Only
  // needed for the states that render a related-numbers section.
  const related: AreaNumber[] =
    result.type === "spam" || result.type === "unknown"
      ? (await getNumbersForAreaCode(code))
          .filter((n) => n.phone_number !== normalized)
          .slice(0, 5)
      : [];

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Link href="/" className="text-sm text-zinc-500 hover:text-canada">
        ← Back to search
      </Link>

      <header className="mt-4">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {pretty}
        </h1>
      </header>

      {/* Status card */}
      <section className="mt-4 rounded-xl border border-zinc-200 p-5">
        {result.type === "legitimate" && (
          <div>
            <Badge color="green" label="✓ Legitimate" />
            <h2 className="mt-3 text-lg font-semibold">
              {result.data.name || "Verified organization"}
            </h2>
            <dl className="mt-2 space-y-1 text-sm text-zinc-600">
              {result.data.category && (
                <div>
                  <dt className="inline font-medium text-zinc-700">Category: </dt>
                  <dd className="inline">{result.data.category}</dd>
                </div>
              )}
              {result.data.website && (
                <div>
                  <dt className="inline font-medium text-zinc-700">Website: </dt>
                  <dd className="inline">
                    <a
                      href={result.data.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-canada underline"
                    >
                      {result.data.website}
                    </a>
                  </dd>
                </div>
              )}
              {result.data.description && (
                <p className="pt-1">{result.data.description}</p>
              )}
            </dl>
          </div>
        )}

        {result.type === "spam" && (
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge color="red" label="⚠ Likely spam" />
              <span className="text-sm text-zinc-600">
                {result.data.spam_count} of {result.data.report_count} reports
                flagged this number
                {result.data.most_common_type
                  ? ` · ${result.data.most_common_type}`
                  : ""}
              </span>
            </div>

            <p className="mt-3 flex flex-wrap items-center gap-x-2 text-sm text-zinc-700">
              <span className="font-semibold">📍 {region ?? `Area code ${code}`}</span>
              <span className="text-zinc-400">·</span>
              <Link href={`/area/${code}`} className="text-canada hover:underline">
                Area code {code}, {province}
              </Link>
            </p>

            {result.data.reports?.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-zinc-700">
                  Recent comments
                </h3>
                <ul className="mt-2 space-y-2">
                  {result.data.reports
                    .filter((r: { comment?: string | null }) => r.comment)
                    .map(
                      (
                        r: {
                          id?: string | number;
                          type?: string | null;
                          comment?: string | null;
                          created_at?: string | null;
                        },
                        i: number
                      ) => {
                        const reported = formatReportDate(r.created_at);
                        return (
                          <li
                            key={r.id ?? i}
                            className="rounded-lg bg-zinc-50 p-3 text-sm"
                          >
                            <div className="mb-1 flex flex-wrap items-center gap-2">
                              {r.type && (
                                <span className="rounded bg-red-50 px-1.5 py-0.5 text-xs font-medium text-canada">
                                  {r.type}
                                </span>
                              )}
                              {reported && (
                                <span className="text-xs text-zinc-400">
                                  Reported {reported}
                                </span>
                              )}
                            </div>
                            <span className="text-zinc-700">{r.comment}</span>
                          </li>
                        );
                      }
                    )}
                </ul>
              </div>
            )}
          </div>
        )}

        {result.type === "unknown" && (
          <div>
            <Badge color="grey" label="No reports yet" />
            <p className="mt-3 text-sm text-zinc-600">
              We don&apos;t have any information about this number yet. If you
              got a call from it, help others by leaving a report below.
            </p>
          </div>
        )}
      </section>

      {/* Warm reassurance tailored to the kind of spam */}
      {result.type === "spam" && (
        <Reassurance
          reports={result.data.reports ?? []}
          mostCommonType={result.data.most_common_type}
        />
      )}

      {/* Similar reported numbers nearby — internal links for spam pages */}
      {result.type === "spam" && (
        <RelatedNumbers
          related={related}
          code={code}
          region={region}
          title="Similar reported numbers in this area code"
          intro={`Other numbers in the ${code} area code${
            region ? ` (${region})` : ""
          } that Canadians have reported.`}
        />
      )}

      {/* Rich content for numbers with no reports yet, so the page still has
          something worth indexing. */}
      {result.type === "unknown" && (
        <>
          <AreaInfoAndTips
            pretty={pretty}
            code={code}
            region={region}
            province={province}
          />
          <RelatedNumbers
            related={related}
            code={code}
            region={region}
            title="Numbers reported near this area code"
            intro={`Recently reported numbers in the ${code} area code${
              region ? ` (${region})` : ""
            }.`}
          />
        </>
      )}

      {/* Ad */}
      <AdUnit className="mt-8" />

      {/* Report form */}
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Report this number</h2>
        <div className="rounded-xl border border-zinc-200 p-5">
          <ReportForm phoneNumber={normalizePhone(number)} />
        </div>
      </section>
    </div>
  );
}
