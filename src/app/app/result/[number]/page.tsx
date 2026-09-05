import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { lookupPhone, formatPhone, normalizePhone } from "@/lib/lookup";
import { isValidAreaCode, cleanComment } from "@/lib/phone";
import { SITE_URL } from "@/lib/config";
import ShareButton from "@/components/app/ShareButton";

// One cached page per number, regenerated daily.
export const revalidate = 86400;

// Required for `revalidate` to apply at all — without it Next treats a dynamic
// route as fully dynamic and re-renders on every request, silently ignoring
// the cache. See AGENTS.md; /lookup/[number] shipped that way for months.
// Returning [] prerenders nothing at build time.
export function generateStaticParams() {
  return [];
}

// generateMetadata and the render both need the lookup; cache() collapses them
// into one database call per request.
const getLookup = cache(lookupPhone);

type Props = { params: Promise<{ number: string }> };
type LookupResult = Awaited<ReturnType<typeof lookupPhone>>;

type Verdict = {
  tone: "danger" | "safe" | "unknown";
  icon: string;
  headline: string;
  reassurance: string;
  happened: string;
};

const ANTI_FRAUD = "https://antifraudcentre-centreantifraude.ca/";
const DNCL = "https://lnnte-dncl.gc.ca/";

// The verdict, the reassurance and the explanation all key off the same result,
// so they're built together — a page that says "scam" above a debt-collector
// explanation would be worse than saying nothing.
function buildVerdict(result: LookupResult, pretty: string): Verdict {
  if (result.type === "legitimate") {
    const name = result.data?.name as string | undefined;
    return {
      tone: "safe",
      icon: "✓",
      headline: "This is legitimate",
      reassurance: name
        ? `You're safe. This is ${name}. If you have questions, it's okay to call back.`
        : "You're safe. This is a verified organization. If you have questions, it's okay to call back.",
      happened: name
        ? `${pretty} belongs to ${name}, a number we've verified. Calls from it are expected — though no legitimate organization will ever ask you for passwords, PINs, or gift cards.`
        : `${pretty} is a verified number. Calls from it are expected — though no legitimate organization will ever ask you for passwords, PINs, or gift cards.`,
    };
  }

  if (result.type === "spam") {
    const n = result.data.report_count as number;
    const others = n === 1 ? "1 other Canadian has" : `${n} other Canadians have`;
    const type = (result.data.most_common_type as string | null) ?? null;

    if (type === "Debt Collector") {
      return {
        tone: "danger",
        icon: "⚠️",
        headline: "This is a debt collector",
        reassurance:
          "You have rights. Canadian law protects you from harassment. Debt collectors cannot call before 7am or after 9pm.",
        happened: `${others} reported ${pretty} as a collection call. Collectors must identify themselves and the debt, cannot contact your employer about it, and must stop calling if you ask in writing. If the "debt" is unfamiliar, do not confirm any personal details — that is a common opening for fraud.`,
      };
    }
    if (type === "Telemarketer") {
      return {
        tone: "danger",
        icon: "⚠️",
        headline: "This is a telemarketer",
        reassurance:
          "You can stop these. Register at Canada's Do Not Call List — it's free and takes 2 minutes.",
        happened: `${others} reported ${pretty} as a sales call. Once you're on the National DNCL, most legitimate telemarketers must stop within 31 days. Ones that keep calling after that are worth reporting to the CRTC.`,
      };
    }
    if (type === "Robocall") {
      return {
        tone: "danger",
        icon: "⚠️",
        headline: "This is a robocall",
        reassurance:
          "Don't press any numbers. Hang up. These are automated nuisance calls that waste your time.",
        happened: `${others} reported ${pretty} as an automated call. Pressing a key — even "press 9 to be removed" — usually just confirms a real person answered, which gets your number called more, not less.`,
      };
    }
    if (type === "Scam") {
      return {
        tone: "danger",
        icon: "⚠️",
        headline: "This is a scam",
        reassurance: `Take a breath. ${others} reported this number. You didn't do anything wrong by checking. The real CRA never threatens arrest over the phone.`,
        happened: `${others} reported ${pretty} as a scam. These calls work by creating urgency — an arrest warrant, a frozen account, a parcel held at customs — so you act before you think. No real agency demands payment by gift card, e-transfer, or crypto. If you shared anything, call your bank now.`,
      };
    }
    return {
      tone: "danger",
      icon: "⚠️",
      headline: "This number has been reported",
      reassurance: `Take a breath. ${others} reported this number. You didn't do anything wrong by checking.`,
      happened: `${others} reported ${pretty} as unwanted. Nobody has pinned down exactly what it is yet — if you know, adding your own report helps the next person who gets this call.`,
    };
  }

  return {
    tone: "unknown",
    icon: "?",
    headline: "No reports yet",
    reassurance:
      "Trust your gut. We haven't seen this number before. If it felt off, it probably was. Let it go to voicemail.",
    happened: `Nobody has reported ${pretty} to Canadial. That doesn't make it safe or unsafe — it only means it's new to us. A caller with real business will leave a voicemail.`,
  };
}

const TONE = {
  danger: {
    panel: "border-red-500/25 bg-red-500/10",
    badge: "bg-red-500/15 text-red-300",
    heading: "text-red-300",
  },
  safe: {
    panel: "border-emerald-500/25 bg-emerald-500/10",
    badge: "bg-emerald-500/15 text-emerald-300",
    heading: "text-emerald-300",
  },
  unknown: {
    panel: "border-white/12 bg-white/5",
    badge: "bg-white/10 text-white/70",
    heading: "text-white/80",
  },
} as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { number } = await params;
  const pretty = formatPhone(number);
  const normalized = normalizePhone(number);
  if (!isValidAreaCode(normalized.slice(0, 3))) return {};
  const result = await getLookup(number);
  const { headline } = buildVerdict(result, pretty);
  return {
    title: { absolute: `${pretty} — ${headline} | Canadial` },
    description: `${pretty}: ${headline.toLowerCase()}. See what to do next.`,
  };
}

function ActionLink({
  href,
  icon,
  title,
  note,
  external,
}: {
  href: string;
  icon: string;
  title: string;
  note: string;
  external?: boolean;
}) {
  const className =
    "flex w-full items-center gap-4 rounded-2xl border border-white/12 bg-white/5 px-5 py-4 transition-colors hover:bg-white/10 active:bg-white/15";
  const inner = (
    <>
      <span aria-hidden className="text-2xl">
        {icon}
      </span>
      <span className="flex-1">
        <span className="block font-semibold text-white">{title}</span>
        <span className="block text-sm text-white/50">{note}</span>
      </span>
    </>
  );
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {inner}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {inner}
    </Link>
  );
}

export default async function AppResultPage({ params }: Props) {
  const { number } = await params;
  const normalized = normalizePhone(number);

  // A NANP area code never starts with 0 or 1; matches /lookup and /area.
  if (!isValidAreaCode(normalized.slice(0, 3))) notFound();

  const pretty = formatPhone(number);
  const result = await getLookup(number);
  const verdict = buildVerdict(result, pretty);
  const tone = TONE[verdict.tone];

  const reportCount =
    result.type === "spam" ? (result.data.report_count as number) : 0;
  const comments: string[] =
    result.type === "spam"
      ? ((result.data.reports ?? []) as { comment?: string | null }[])
          .map((r) => r.comment ?? "")
          .filter(Boolean)
          .slice(0, 3)
      : [];

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-16">
      <Link
        href="/app"
        className="-ml-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm text-white/50 transition-colors hover:text-white"
      >
        ← Check another number
      </Link>

      {/* Verdict */}
      <section className={`mt-2 rounded-3xl border p-7 text-center ${tone.panel}`}>
        <div aria-hidden className="text-6xl leading-none">
          {verdict.icon}
        </div>
        <h1 className={`mt-4 text-3xl font-bold tracking-tight ${tone.heading}`}>
          {verdict.headline}
        </h1>
        <p className="mt-2 text-xl font-medium tabular-nums text-white/80">
          {pretty}
        </p>
        <p className="mt-5 text-base leading-relaxed text-white/70">
          {verdict.reassurance}
        </p>
      </section>

      {/* Actions */}
      <section className="mt-7 space-y-3">
        <h2 className="px-1 pb-1 text-sm font-semibold uppercase tracking-wide text-white/40">
          What to do now
        </h2>

        <details className="group rounded-2xl border border-white/12 bg-white/5 transition-colors open:bg-white/10">
          <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
            <span aria-hidden className="text-2xl">
              🚫
            </span>
            <span className="flex-1">
              <span className="block font-semibold text-white">
                Block this number
              </span>
              <span className="block text-sm text-white/50">
                Takes about 15 seconds
              </span>
            </span>
            <span
              aria-hidden
              className="text-white/40 transition-transform group-open:rotate-180"
            >
              ▾
            </span>
          </summary>
          <div className="space-y-4 px-5 pb-5 text-sm leading-relaxed text-white/70">
            <div>
              <p className="font-semibold text-white/90">iPhone</p>
              <p>
                Phone app → Recents → tap the ⓘ beside {pretty} → scroll down →
                Block this Caller.
              </p>
            </div>
            <div>
              <p className="font-semibold text-white/90">Android</p>
              <p>
                Phone app → Recents → press and hold {pretty} → Block / report
                spam.
              </p>
            </div>
          </div>
        </details>

        <ActionLink
          href={ANTI_FRAUD}
          external
          icon="🛡️"
          title="Report to the Anti-Fraud Centre"
          note="Canadian Anti-Fraud Centre — takes a few minutes"
        />

        {verdict.tone === "danger" &&
        result.type === "spam" &&
        result.data.most_common_type === "Telemarketer" ? (
          <ActionLink
            href={DNCL}
            external
            icon="📵"
            title="Add yourself to the Do Not Call List"
            note="Free, and most sales calls must stop within 31 days"
          />
        ) : null}

        <ActionLink
          href="/rights"
          icon="📖"
          title="How this kind of call works"
          note="Know your rights when the phone rings"
        />

        <ShareButton
          phone={pretty}
          verdict={verdict.headline}
          url={`${SITE_URL}/app/result/${normalized}`}
        />
      </section>

      {/* Explanation */}
      <section className="mt-8">
        <h2 className="px-1 pb-2 text-sm font-semibold uppercase tracking-wide text-white/40">
          What likely happened
        </h2>
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-base leading-relaxed text-white/70">
          {verdict.happened}
        </p>
      </section>

      {/* What other people said — only when there is something real to show. */}
      {comments.length > 0 && (
        <section className="mt-8">
          <h2 className="px-1 pb-2 text-sm font-semibold uppercase tracking-wide text-white/40">
            What others said
          </h2>
          <ul className="space-y-2">
            {comments.map((c, i) => (
              <li
                key={i}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-relaxed text-white/60"
              >
                “{cleanComment(c)}”
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Community note. Deliberately phrased as reports, not "checks" — the
          database records reports and nothing counts lookups, so a "X people
          checked this" line would be a number we made up. */}
      <p className="mt-9 text-center text-sm leading-relaxed text-white/40">
        {reportCount > 0
          ? `You're not alone — ${reportCount.toLocaleString("en-CA")} ${
              reportCount === 1 ? "Canadian has" : "Canadians have"
            } reported this number to Canadial.`
          : "Nobody has reported this number yet. If it felt wrong, your report is what warns the next person."}
      </p>

      <div className="mt-6 text-center">
        <Link
          href={`/lookup/${normalized}`}
          className="text-sm text-white/35 underline-offset-4 hover:text-white/60 hover:underline"
        >
          See the full report for this number
        </Link>
      </div>
    </div>
  );
}
