import type { Metadata } from "next";
import Link from "next/link";
import { lookupPhone, formatPhone, normalizePhone } from "@/lib/lookup";
import ReportForm from "@/components/ReportForm";

type Props = { params: Promise<{ number: string }> };

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

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
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
