import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { lookupPhone } from "@/lib/lookup";
import { formatPhone, normalizePhone } from "@/lib/phone";
import {
  LOOKUP_CONTENT,
  getLocale,
  interp,
  type LookupStrings,
  type ReassureStrings,
} from "@/lib/i18n";
import { SITE_URL } from "@/lib/config";
import ReportForm from "@/components/ReportForm";

// Cache each number page and regenerate daily (see src/app/lookup/[number]/page.tsx).
export const revalidate = 86400;

type Props = { params: Promise<{ lang: string; number: string }> };
type LookupResult = Awaited<ReturnType<typeof lookupPhone>>;

// Only the non-English locales have their own lookup route.
function isSupportedLang(lang: string): boolean {
  const loc = getLocale(lang);
  return !!loc && loc.code !== "en" && !!LOOKUP_CONTENT[lang];
}

// hreflang map: this number across every language version.
function languagesForNumber(num: string): Record<string, string> {
  const map: Record<string, string> = {
    en: `/lookup/${num}`,
    "x-default": `/lookup/${num}`,
  };
  for (const code of Object.keys(LOOKUP_CONTENT)) {
    const loc = getLocale(code);
    if (loc) map[loc.hreflang] = `/${code}/lookup/${num}`;
  }
  return map;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, number } = await params;
  if (!isSupportedLang(lang)) return {};
  const num = normalizePhone(number);
  const pretty = formatPhone(number);
  const t = LOOKUP_CONTENT[lang];
  return {
    title: interp(t.title, { number: pretty }),
    description: interp(t.description, { number: pretty }),
    alternates: {
      canonical: `/${lang}/lookup/${num}`,
      languages: languagesForNumber(num),
    },
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

function ReassuranceBox({
  tone,
  title,
  body,
}: {
  tone: "blue" | "grey";
  title: string;
  body: string;
}) {
  const styles =
    tone === "blue"
      ? "bg-blue-50 border-blue-200 text-blue-900"
      : "bg-zinc-50 border-zinc-200 text-zinc-700";
  return (
    <div className={`mt-4 rounded-xl border p-5 ${styles}`}>
      <p className="font-semibold leading-snug">{title}</p>
      <p className="mt-1.5 text-sm leading-relaxed">{body}</p>
    </div>
  );
}

function reassurance(
  reports: { type?: string | null; comment?: string | null }[],
  mostCommonType: string | null,
  r: ReassureStrings
) {
  const types = new Set(
    [mostCommonType, ...reports.map((x) => x.type)].filter(Boolean) as string[]
  );
  const commentText = reports.map((x) => x.comment ?? "").join(" ").toLowerCase();

  if (types.has("Scam") && /cra|tax|arrest/.test(commentText))
    return <ReassuranceBox tone="blue" title={r.craTitle} body={r.craBody} />;
  if (types.has("Debt Collector"))
    return <ReassuranceBox tone="blue" title={r.debtTitle} body={r.debtBody} />;
  if (types.has("Telemarketer"))
    return <ReassuranceBox tone="grey" title={r.teleTitle} body={r.teleBody} />;
  return <ReassuranceBox tone="grey" title={r.spamTitle} body={r.spamBody} />;
}

export default async function LangLookupPage({ params }: Props) {
  const { lang, number } = await params;
  if (!isSupportedLang(lang)) notFound();

  const loc = getLocale(lang)!;
  const t: LookupStrings = LOOKUP_CONTENT[lang];
  const pretty = formatPhone(number);
  const num = normalizePhone(number);
  const result: LookupResult = await lookupPhone(number);

  if (result.type === "invalid") {
    return (
      <div
        dir={loc.dir}
        lang={loc.htmlLang}
        className="mx-auto w-full max-w-2xl px-4 py-16 text-center"
      >
        <Badge color="grey" label={t.invalidTitle} />
        <h1 className="mt-4 text-2xl font-bold">{t.invalidTitle}</h1>
        <p className="mt-2 text-zinc-600">
          {interp(t.invalidBody, { number })}
        </p>
        <Link
          href={`/${lang}`}
          className="mt-6 inline-block rounded-lg bg-canada px-5 py-2.5 font-semibold text-white hover:bg-red-700"
        >
          {t.backToSearch}
        </Link>
      </div>
    );
  }

  return (
    <div
      dir={loc.dir}
      lang={loc.htmlLang}
      className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12"
    >
      <Link
        href={`/${lang}`}
        className="text-sm text-zinc-500 hover:text-canada"
      >
        ← {t.backToSearch}
      </Link>

      <header className="mt-4">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {pretty}
        </h1>
      </header>

      <section className="mt-4 rounded-xl border border-zinc-200 p-5">
        {result.type === "legitimate" && (
          <div>
            <Badge color="green" label={`✓ ${t.verifiedLegitimate}`} />
            {result.data?.name && (
              <h2 className="mt-3 text-lg font-semibold">{result.data.name}</h2>
            )}
          </div>
        )}

        {result.type === "spam" && (
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge color="red" label={`⚠ ${t.likelySpam}`} />
              <span className="text-sm text-zinc-600">
                {interp(t.reportsFlagged, {
                  spam: result.data.spam_count,
                  total: result.data.report_count,
                })}
                {result.data.most_common_type
                  ? ` · ${result.data.most_common_type}`
                  : ""}
              </span>
            </div>

            {result.data.reports?.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-zinc-700">
                  {t.recentComments}
                </h3>
                <ul className="mt-2 space-y-2">
                  {result.data.reports
                    .filter((x: { comment?: string | null }) => x.comment)
                    .map(
                      (
                        x: {
                          id?: string | number;
                          type?: string | null;
                          comment?: string | null;
                        },
                        i: number
                      ) => (
                        <li
                          key={x.id ?? i}
                          className="rounded-lg bg-zinc-50 p-3 text-sm"
                        >
                          {x.type && (
                            <span className="mr-2 rounded bg-red-50 px-1.5 py-0.5 text-xs font-medium text-canada">
                              {x.type}
                            </span>
                          )}
                          <span className="text-zinc-700">{x.comment}</span>
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
            <Badge color="grey" label={t.noReports} />
            <p className="mt-3 text-sm text-zinc-600">{t.noReportsBody}</p>
          </div>
        )}
      </section>

      {result.type === "spam" &&
        reassurance(
          result.data.reports ?? [],
          result.data.most_common_type,
          t.reassure
        )}

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">{t.reportThisNumber}</h2>
        <div className="rounded-xl border border-zinc-200 p-5">
          <ReportForm phoneNumber={num} labels={t.form} />
        </div>
      </section>
    </div>
  );
}
