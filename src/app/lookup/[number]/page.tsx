import type { Metadata } from "next";
import Link from "next/link";
import { lookupPhone, formatPhone, normalizePhone } from "@/lib/lookup";
import { SITE_URL } from "@/lib/config";
import ReportForm from "@/components/ReportForm";

// Cache each number page and regenerate hourly — keeps crawls cheap.
export const revalidate = 3600;

type Props = { params: Promise<{ number: string }> };

type LookupResult = Awaited<ReturnType<typeof lookupPhone>>;

// Schema.org structured data: a breadcrumb plus an FAQ-style Q&A that mirrors
// the page's verdict, for rich results.
function buildJsonLd(number: string, pretty: string, result: LookupResult) {
  const code = number.slice(0, 3);
  const url = `${SITE_URL}/lookup/${number}`;

  let answer: string;
  if (result.type === "legitimate") {
    const name = result.data?.name ? ` belonging to ${result.data.name}` : "";
    answer = `${pretty} is a verified, legitimate phone number${name}.`;
  } else if (result.type === "spam") {
    const kind = result.data.most_common_type
      ? ` as ${result.data.most_common_type}`
      : "";
    answer = `${pretty} has been reported ${result.data.report_count} time${
      result.data.report_count === 1 ? "" : "s"
    }${kind} and is likely spam or an unwanted call.`;
  } else {
    answer = `There are no spam reports for ${pretty} yet.`;
  }

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
        mainEntity: [
          {
            "@type": "Question",
            name: `Is ${pretty} spam?`,
            acceptedAnswer: { "@type": "Answer", text: answer },
          },
        ],
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

  const jsonLd = buildJsonLd(normalizePhone(number), pretty, result);

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
                        },
                        i: number
                      ) => (
                        <li
                          key={r.id ?? i}
                          className="rounded-lg bg-zinc-50 p-3 text-sm"
                        >
                          {r.type && (
                            <span className="mr-2 rounded bg-red-50 px-1.5 py-0.5 text-xs font-medium text-canada">
                              {r.type}
                            </span>
                          )}
                          <span className="text-zinc-700">{r.comment}</span>
                        </li>
                      )
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
