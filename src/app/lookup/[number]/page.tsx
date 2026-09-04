import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { lookupPhone, formatPhone, normalizePhone } from "@/lib/lookup";
import { cleanComment, isFtcSource, describeFtcReport, isValidAreaCode } from "@/lib/phone";
import { getAreaSummary, type AreaNumber } from "@/lib/spam";
import { regionForCode } from "@/lib/area-codes";
import {
  provinceForAreaCode,
  numberTypeForCode,
  countryForAreaCode,
  isCanadianAreaCode,
} from "@/lib/provinces";
import { SITE_NAME, SITE_URL } from "@/lib/config";
import ReportForm, { DEFAULT_LABELS } from "@/components/ReportForm";
import AdUnit from "@/components/AdUnit";

// Cache each number page and regenerate daily — keeps crawls (and egress
// across ~336k number pages) cheap.
export const revalidate = 86400;

// Required for `revalidate` to actually apply. Without a generateStaticParams
// export, Next treats this route as fully dynamic and re-renders it on every
// single request — `revalidate` is silently ignored (see
// node_modules/next/dist/docs/.../generate-static-params.md: "You must return
// an empty array from generateStaticParams ... in order to revalidate (ISR)
// paths at runtime"). That was costing ~100+ rows of egress per crawler hit,
// across every number page. Returning [] prerenders nothing at build time but
// makes each page ISR-cached on first request.
export function generateStaticParams() {
  return [];
}

// generateMetadata and the page render both need the lookup; cache() dedupes
// them into a single DB call per request.
const getLookup = cache(lookupPhone);

type Props = { params: Promise<{ number: string }> };

type LookupResult = Awaited<ReturnType<typeof lookupPhone>>;

// The four FAQ questions every lookup page answers, using the number's real
// data. Shared between the visible FAQ section and the Schema.org FAQPage so the
// rich result and the page stay in sync.
function buildFaq(
  pretty: string,
  code: string,
  region: string | null,
  province: string,
  result: LookupResult
): { q: string; a: string }[] {
  const where = region
    ? `the ${code} area code, which serves ${region} in ${province}, Canada`
    : `the ${code} area code in ${province}`;

  let safe: string;
  let who: string;
  let callback: string;

  if (result.type === "legitimate") {
    const name = result.data?.name ? ` belonging to ${result.data.name}` : "";
    safe = `Yes. ${pretty} is a verified, legitimate phone number${name}, so it is safe to answer.`;
    who = result.data?.name
      ? `${pretty} belongs to ${result.data.name}${
          result.data.category ? `, a ${result.data.category}` : ""
        }.`
      : `${pretty} is a verified, legitimate number.`;
    callback = `Yes, ${pretty} is a verified number, so it is safe to call back.`;
  } else if (result.type === "spam") {
    const n = result.data.report_count;
    const times = `${n} time${n === 1 ? "" : "s"}`;
    const kind = result.data.most_common_type
      ? ` as ${result.data.most_common_type}`
      : "";
    safe = `Be cautious. ${pretty} has been reported ${times}${kind} by Canadians, so it is likely an unwanted or spam call. If you don't recognise it, let it go to voicemail.`;
    who = `${pretty} has been reported ${times}${kind}. ${
      result.data.most_common_type
        ? `Most callers describe it as ${result.data.most_common_type}.`
        : "Canadians have flagged it as an unwanted caller."
    }`;
    callback = `No. Don't call ${pretty} back — returning a spam or scam call can confirm your number is active and lead to more calls.`;
  } else {
    safe = `There are no reports for ${pretty} yet, so we can't confirm it is safe. If you don't recognise the number, let it go to voicemail — a legitimate caller will leave a message.`;
    who = `Nobody has reported ${pretty} yet, so the caller is unknown. Be the first to add a report if you've had a call.`;
    callback = `If you don't recognise ${pretty}, it is safer not to call back. Wait for a voicemail or search the number first.`;
  }

  let reportedTimes: string;
  if (result.type === "spam") {
    const n = result.data.report_count;
    reportedTimes = `${pretty} has been reported ${n} time${
      n === 1 ? "" : "s"
    } by Canadians${
      result.data.most_common_type
        ? `, most often as ${result.data.most_common_type}`
        : ""
    }.`;
  } else if (result.type === "legitimate") {
    reportedTimes = `${pretty} is a verified legitimate number and has no spam reports.`;
  } else {
    reportedTimes = `${pretty} has not been reported yet. If you received a call from it, you can be the first to add a report.`;
  }

  return [
    { q: `Is ${pretty} safe to answer?`, a: safe },
    { q: `Who is calling from ${pretty}?`, a: who },
    {
      q: `What area is ${pretty} from?`,
      a: `${pretty} uses ${where}.`,
    },
    { q: `Should I call ${pretty} back?`, a: callback },
    { q: `How many times has ${pretty} been reported?`, a: reportedTimes },
    {
      q: `What area code is ${pretty} from?`,
      a: `${pretty} is in the ${code} area code${
        region ? `, which serves ${region}` : `, associated with ${province}`
      }.`,
    },
    {
      q: `Is ${pretty} a Canadian number?`,
      a: isCanadianAreaCode(code)
        ? `Yes. ${pretty} uses the ${code} area code, a Canadian area code${
            region ? ` serving ${region}` : ` in ${province}`
          }.`
        : `The ${code} area code is not a recognised Canadian geographic area code, so ${pretty} may be a toll-free or non-Canadian number.`,
    },
  ];
}

// Schema.org structured data: a breadcrumb plus the page's FAQ, for rich
// results. The FAQ gives Google indexable content even when a number has few or
// no reports.
function buildJsonLd(number: string, pretty: string, result: LookupResult) {
  const code = number.slice(0, 3);
  const url = `${SITE_URL}/lookup/${number}`;
  const region = regionForCode(code);
  const province = provinceForAreaCode(code);

  const faq = buildFaq(pretty, code, region, province, result);

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
  const normalized = normalizePhone(number);

  if (normalized.length !== 10) {
    return {
      // `absolute` bypasses the root "%s | Canadial" template.
      title: { absolute: `${pretty} — Canadian Phone Lookup | ${SITE_NAME}` },
      description: `${pretty} is not a valid 10-digit Canadian phone number.`,
    };
  }

  // Build a unique-per-number title and description from real data, varied by
  // whether the number is spam, verified, or unknown.
  const result = await getLookup(number);
  const code = normalized.slice(0, 3);
  const region = regionForCode(code);
  const province = provinceForAreaCode(code);
  // regionForCode already includes the province abbreviation (e.g. "Toronto,
  // ON"), so use it as-is; fall back to the full province name when unknown.
  const place = region ?? province;

  let title: string;
  let description: string;
  if (result.type === "legitimate") {
    const org = result.data?.name ? ` belonging to ${result.data.name}` : "";
    title = `${pretty} — Verified Legitimate | ${SITE_NAME}`;
    description = `${pretty} is a verified legitimate number${org}. Located in ${place}. Check contact details, category, and links on Canadial.`;
  } else if (result.type === "spam") {
    const type = result.data.most_common_type ?? "spam";
    const n = result.data.report_count;
    title = `Is ${pretty} a Scam? ${n} Report${n === 1 ? "" : "s"} | ${SITE_NAME}`;
    description = `${pretty} has been reported ${n} time${
      n === 1 ? "" : "s"
    } as ${type} by Canadians. Located in ${place}. See community reports and protect yourself.`;
  } else {
    title = `${pretty} — Canadian Phone Lookup | ${SITE_NAME}`;
    description = `Look up ${pretty}, a phone number in ${place}, Canada. Check if this number is spam or legitimate. Free community-powered lookup.`;
  }

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/lookup/${normalized}` },
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

// "About this number" — area-code facts that are true for every valid number,
// so even thin pages carry concrete, unique-per-number information.
function AboutThisNumber({
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
  const rows: [string, string][] = [
    ["Phone number", pretty],
    ["Area code", region ? `${code} — serves ${region}` : code],
    ["Province", province],
    ["Country", countryForAreaCode(code)],
    ["Number type", numberTypeForCode(code)],
    [
      "Origin",
      isCanadianAreaCode(code)
        ? "Canadian number"
        : "Not a recognised Canadian area code",
    ],
  ];
  return (
    <section className="mt-8 rounded-xl border border-zinc-200 p-5">
      <h2 className="text-lg font-semibold">About this number</h2>
      <dl className="mt-3 grid grid-cols-1 gap-1 text-sm text-zinc-600 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="inline font-medium text-zinc-700">{label}: </dt>
            <dd className="inline">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-sm leading-relaxed text-zinc-600">
        {pretty} uses the {code} area code
        {region ? `, which serves ${region}` : ""}. Numbers in this area code are
        based in {province}
        {isCanadianAreaCode(code) ? ", Canada" : ""}.
      </p>
    </section>
  );
}

// "About area code [XXX]" — aggregate community stats for the whole area code,
// giving each number page unique regional context beyond the single number.
function AreaCodeInsights({
  code,
  region,
  province,
  reportedNumberCount,
  topType,
  reportTotal,
}: {
  code: string;
  region: string | null;
  province: string;
  reportedNumberCount: number;
  topType: string | null;
  reportTotal: number;
}) {
  const place = region ?? `the ${code} area code`;
  const nf = (n: number) => n.toLocaleString("en-CA");
  return (
    <section className="mt-8 rounded-xl border border-zinc-200 bg-zinc-50 p-5">
      <h2 className="text-lg font-semibold">About area code {code}</h2>
      <dl className="mt-3 grid grid-cols-1 gap-1 text-sm text-zinc-600 sm:grid-cols-2">
        <div>
          <dt className="inline font-medium text-zinc-700">
            Province / region:{" "}
          </dt>
          <dd className="inline">{region ?? province}</dd>
        </div>
        <div>
          <dt className="inline font-medium text-zinc-700">
            Numbers reported here:{" "}
          </dt>
          <dd className="inline">{nf(reportedNumberCount)}</dd>
        </div>
        <div>
          <dt className="inline font-medium text-zinc-700">
            Most common call type:{" "}
          </dt>
          <dd className="inline">{topType ?? "—"}</dd>
        </div>
      </dl>
      {reportedNumberCount > 0 ? (
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">
          Numbers like this one have been reported{" "}
          <strong>{nf(reportTotal)}</strong> time
          {reportTotal === 1 ? "" : "s"} in the {place} area
          {topType ? (
            <>
              , most often as <strong>{topType}</strong>
            </>
          ) : null}
          .{" "}
          <Link
            href={`/area/${code}`}
            className="font-medium text-canada hover:underline"
          >
            See all reported {code} numbers →
          </Link>
        </p>
      ) : (
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">
          No spam numbers have been reported in the {code} area code yet. Help
          Canadians by reporting any suspicious calls you receive from {place}.
        </p>
      )}
    </section>
  );
}

// "What to do if you receive this call" — concrete next steps keyed to the kind
// of call. `type` is the most common reported type, or null for unknown numbers.
function WhatToDo({ type }: { type: string | null }) {
  let body: React.ReactNode;
  switch (type) {
    case "Scam":
      body = (
        <>
          Do not call back and do not provide personal information. Report it to
          the Canadian Anti-Fraud Centre at{" "}
          <a className="font-semibold underline" href="tel:+18884958501">
            1-888-495-8501
          </a>
          .
        </>
      );
      break;
    case "Debt Collector":
      body = (
        <>
          You have rights under Canadian law. Debt collectors cannot call before
          7am or after 9pm. Contact the FCAC at{" "}
          <a className="font-semibold underline" href="tel:+18664613222">
            1-866-461-3222
          </a>{" "}
          if you feel harassed.
        </>
      );
      break;
    case "Telemarketer":
      body = (
        <>
          Register for Canada&apos;s Do Not Call List at{" "}
          <a
            className="font-semibold underline"
            href="https://lnnte-dncl.gc.ca/"
            target="_blank"
            rel="noopener noreferrer"
          >
            lnnte-dncl.gc.ca
          </a>{" "}
          to stop unwanted calls.
        </>
      );
      break;
    case "Robocall":
      body = (
        <>
          Do not press any numbers. Hang up immediately. Report it to the CRTC at{" "}
          <a
            className="font-semibold underline"
            href="https://crtc.gc.ca/"
            target="_blank"
            rel="noopener noreferrer"
          >
            crtc.gc.ca
          </a>
          .
        </>
      );
      break;
    default:
      body = (
        <>
          If you&apos;re unsure, let it go to voicemail. Legitimate callers will
          leave a message.
        </>
      );
  }
  return (
    <section className="mt-8 rounded-xl border border-zinc-200 p-5">
      <h2 className="text-lg font-semibold">
        What to do if you receive this call
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-700">{body}</p>
    </section>
  );
}

// Visible FAQ mirroring the Schema.org FAQPage, built from the same real data.
function FaqSection({ faq }: { faq: { q: string; a: string }[] }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">Frequently asked questions</h2>
      <dl className="mt-3 divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200">
        {faq.map(({ q, a }) => (
          <div key={q} className="p-4">
            <dt className="font-medium text-zinc-900">{q}</dt>
            <dd className="mt-1 text-sm leading-relaxed text-zinc-600">{a}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default async function LookupPage({ params }: Props) {
  const { number } = await params;
  const pretty = formatPhone(number);

  // 404 rather than render a page for a number that cannot exist. The imported
  // datasets contain junk like 1111111111 and 0000000000, and each one was
  // otherwise getting a real, indexable page.
  if (!isValidAreaCode(normalizePhone(number).slice(0, 3))) notFound();

  const result = await getLookup(number);

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
  const faq = buildFaq(pretty, code, region, province, result);

  // Area-code context, aggregated in Postgres rather than by pulling the
  // code's recent reports in and reducing them here. This route renders for
  // ~336k numbers, so the summary is deliberately ~1 KB instead of ~21 KB.
  const area = await getAreaSummary(code);
  const related: AreaNumber[] = area.topNumbers
    .filter((n) => n.phone_number !== normalized)
    .slice(0, 5);
  const areaTopType = area.topType;
  const areaReportTotal = area.reportTotal;

  // The most common type for *this* number drives the "what to do" advice;
  // fall back to null (generic advice) for legitimate/unknown numbers.
  const thisType = result.type === "spam" ? result.data.most_common_type : null;

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
                          source?: string | null;
                        },
                        i: number
                      ) => {
                        const reported = formatReportDate(r.created_at);
                        const ftc = isFtcSource(r.source);
                        // FTC records get structured display: a neutral badge,
                        // a "Reported to FTC" line, and the complaint subject.
                        const ftcParts = ftc
                          ? describeFtcReport(r.comment)
                          : null;
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
                              {ftc && (
                                <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-xs font-medium text-zinc-600">
                                  FTC Verified Complaint
                                </span>
                              )}
                              {reported && (
                                <span className="text-xs text-zinc-400">
                                  Reported {reported}
                                </span>
                              )}
                            </div>
                            {ftcParts ? (
                              <div className="space-y-0.5">
                                {ftcParts.subject && (
                                  <p className="text-zinc-700">
                                    <span className="font-medium text-zinc-600">
                                      📋 Complaint subject:
                                    </span>{" "}
                                    {ftcParts.subject}
                                  </p>
                                )}
                                <p
                                  className={
                                    ftcParts.subject
                                      ? "text-xs text-zinc-500"
                                      : "text-zinc-700"
                                  }
                                >
                                  {ftcParts.body}
                                </p>
                              </div>
                            ) : (
                              <span className="text-zinc-700">
                                {cleanComment(r.comment ?? "")}
                              </span>
                            )}
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

      {/* Unknown numbers: surface the report form immediately, with a prominent
          "be the first" call to action, so the page has a clear primary task. */}
      {result.type === "unknown" && (
        <section className="mt-4 rounded-2xl border-2 border-canada/30 bg-red-50/60 p-5 sm:p-6">
          <h2 className="text-xl font-bold text-zinc-900 sm:text-2xl">
            Be the first to report this number
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">
            Got a call from <span className="font-semibold">{pretty}</span>? Add
            a quick report to warn other Canadians and build its history.
          </p>
          <div className="mt-4">
            <ReportForm
              phoneNumber={normalized}
              prominent
              labels={{ ...DEFAULT_LABELS, submit: "Report this number 🍁" }}
            />
          </div>
        </section>
      )}

      {/* Warm reassurance tailored to the kind of spam */}
      {result.type === "spam" && (
        <Reassurance
          reports={result.data.reports ?? []}
          mostCommonType={result.data.most_common_type}
        />
      )}

      {/* Concrete facts about this number — shown on every valid page */}
      <AboutThisNumber
        pretty={pretty}
        code={code}
        region={region}
        province={province}
      />

      {/* Area-wide aggregate context, derived from the whole area code */}
      <AreaCodeInsights
        code={code}
        region={region}
        province={province}
        reportedNumberCount={area.numberCount}
        topType={areaTopType}
        reportTotal={areaReportTotal}
      />

      {/* Next steps keyed to the call type. Skipped for verified numbers, where
          the advice wouldn't apply. */}
      {result.type !== "legitimate" && <WhatToDo type={thisType} />}

      {/* Generic area facts + spotting tips for numbers with no reports yet. */}
      {result.type === "unknown" && (
        <AreaInfoAndTips
          pretty={pretty}
          code={code}
          region={region}
          province={province}
        />
      )}

      {/* Related numbers in this area code — internal links to nearby reports */}
      <RelatedNumbers
        related={related}
        code={code}
        region={region}
        title={`Related numbers in area code ${code}`}
        intro={`Other reported numbers in the ${code} area code${
          region ? ` (${region})` : ""
        }, with their reported type and report count.`}
      />

      {/* FAQ built from this number's real data */}
      <FaqSection faq={faq} />

      {/* Ad */}
      <AdUnit className="mt-8" />

      {/* Report form. For unknown numbers this already appears prominently near
          the top, so we don't repeat it here. */}
      {result.type !== "unknown" && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Report this number</h2>
          <div className="rounded-xl border border-zinc-200 p-5">
            <ReportForm phoneNumber={normalized} />
          </div>
        </section>
      )}
    </div>
  );
}
