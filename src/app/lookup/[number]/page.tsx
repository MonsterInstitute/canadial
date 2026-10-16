import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";
import { formatPhone, normalizePhone, isValidAreaCode } from "@/lib/phone";
import {
  countPhrase,
  loadNumber,
  verdict,
  placeLabel,
  formatDate,
  monthLabel,
  reportSource,
  type NumberData,
  type Verdict,
} from "@/lib/number-data";
import { SITE_NAME, SITE_URL } from "@/lib/config";
import ReportForm from "@/components/ReportForm";
import AdUnit from "@/components/AdUnit";
import NumberActivity from "@/components/NumberActivity";

// Every number page is built from that number's own data: FTC complaint
// aggregates, community reports, and the NPA-NXX block it belongs to. No
// paragraph exists that only swaps the phone number in; sections with no data
// are left out rather than filled.
//
// Rendered on demand from D1 (one round trip of bounded reads, see
// src/lib/number-data.ts) and cached at Cloudflare's edge by worker.ts.
export const dynamic = "force-dynamic";

const getData = cache(loadNumber);

type Props = { params: Promise<{ number: string }> };

// The one URL a number's page lives at, or null when the segment is not a
// real number: other spellings 308 to it, junk 404s, before any database work.
function canonicalNumber(raw: string): string | null {
  let s = raw;
  try {
    s = decodeURIComponent(raw);
  } catch {
    // Malformed escape: fall through with the raw segment.
  }
  const digits = s.replace(/\D/g, "");
  if (!(digits.length === 10 || (digits.length === 11 && digits.startsWith("1")))) return null;
  const n = normalizePhone(digits);
  return isValidAreaCode(n.slice(0, 3)) ? n : null;
}

function canonicalOrExit(raw: string): string {
  const canonical = canonicalNumber(raw);
  if (!canonical) notFound();
  if (canonical !== raw) permanentRedirect(`/lookup/${canonical}`);
  return canonical;
}

const nf = (n: number) => n.toLocaleString("en-CA");
const pct = (part: number, whole: number) => (whole ? Math.round((100 * part) / whole) : 0);

function originPhrase(d: NumberData): string | null {
  if (d.tollFree) return "toll-free number";
  if (d.block?.status === "unassigned") return "unassigned block";
  return placeLabel(d);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { number: raw } = await params;
  const n = canonicalOrExit(raw);
  const d = await getData(n);
  const pretty = formatPhone(n);
  const v = verdict(d);
  const total = d.ftc.total + d.community.total;
  const origin = originPhrase(d);
  const robo = d.ftc.total >= 3 ? pct(d.ftc.robocalls, d.ftc.total) : 0;

  let title: string;
  if (d.org) title = `${pretty} — ${d.org.name ?? "verified organization"} (verified)`;
  else if (total === 0) title = `${pretty} — no complaints on record${origin ? ` — ${origin}` : ""}`;
  else title = `${pretty}: ${countPhrase(d.ftc.total, d.community.total)}${robo >= 50 ? `, ${robo}% robocalls` : ""}${origin ? ` — ${origin}` : ""}`;

  const desc: string[] = [];
  if (d.ftc.total) {
    const range = d.ftc.first && d.ftc.last ? ` between ${monthLabel(d.ftc.first.slice(0, 7))} and ${monthLabel(d.ftc.last.slice(0, 7))}` : "";
    const top = d.ftc.subjects.find((s) => s.label !== "Not specified / other");
    desc.push(`${nf(d.ftc.total)} FTC complaint${d.ftc.total === 1 ? "" : "s"}${range}${top ? `, most often about ${top.label.toLowerCase()} (${pct(top.n, d.ftc.total)}%)` : ""}.`);
  }
  if (d.community.total) desc.push(`${nf(d.community.total)} community report${d.community.total === 1 ? "" : "s"}.`);
  if (d.block?.status === "unassigned") desc.push("Its number block isn't assigned to any carrier: the caller ID was likely spoofed.");
  else if (d.block?.carrier) desc.push(`Number block assigned to ${d.block.carrier}${placeLabel(d) ? ` in ${placeLabel(d)}` : ""}.`);
  if (!desc.length) desc.push(`${v.label}.`);

  return {
    title: { absolute: `${title} | ${SITE_NAME}` },
    description: desc.join(" "),
    alternates: { canonical: `/lookup/${n}` },
    openGraph: { title, description: desc.join(" "), url: `${SITE_URL}/lookup/${n}` },
  };
}

const LEVEL_STYLE: Record<Verdict["level"], string> = {
  high: "border-red-300 bg-red-50 text-red-900",
  medium: "border-amber-300 bg-amber-50 text-amber-900",
  low: "border-yellow-200 bg-yellow-50 text-yellow-900",
  none: "border-zinc-200 bg-zinc-50 text-zinc-800",
  verified: "border-emerald-300 bg-emerald-50 text-emerald-900",
};

function Section({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
  return (
    <section className="mt-8" id={id}>
      <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-3">
      <div className="text-xl font-bold text-zinc-900">{value}</div>
      <div className="text-xs text-zinc-500">{label}</div>
    </div>
  );
}

// Complaints per month as a small server-rendered SVG bar chart.
function MonthlyChart({ months }: { months: { ym: string; n: number }[] }) {
  const max = Math.max(...months.map((m) => m.n), 1);
  const w = 640;
  const h = 120;
  const gap = months.length > 40 ? 1 : 2;
  const bw = Math.max(2, (w - gap * months.length) / months.length);
  const first = months[0]?.ym;
  const last = months[months.length - 1]?.ym;
  return (
    <figure>
      <svg viewBox={`0 0 ${w} ${h + 18}`} className="w-full" role="img" aria-label={`FTC complaints per month, ${first ? monthLabel(first) : ""} to ${last ? monthLabel(last) : ""}`}>
        {months.map((m, i) => {
          const bh = m.n ? Math.max(2, (m.n / max) * h) : 0;
          return (
            <rect key={m.ym} x={i * (bw + gap)} y={h - bh} width={bw} height={bh} className="fill-red-500">
              <title>{`${monthLabel(m.ym)}: ${nf(m.n)}`}</title>
            </rect>
          );
        })}
        <line x1="0" y1={h} x2={w} y2={h} className="stroke-zinc-300" />
        {first && <text x="0" y={h + 14} className="fill-zinc-500 text-[11px]">{monthLabel(first)}</text>}
        {last && last !== first && <text x={w} y={h + 14} textAnchor="end" className="fill-zinc-500 text-[11px]">{monthLabel(last)}</text>}
      </svg>
      <figcaption className="mt-1 text-xs text-zinc-500">FTC complaints per month (by call date); peak {nf(max)} in a month.</figcaption>
    </figure>
  );
}

function Bars({ rows, total }: { rows: { label: string; n: number }[]; total: number }) {
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.label} className="text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-zinc-700">{r.label}</span>
            <span className="tabular-nums text-zinc-500">{nf(r.n)} · {pct(r.n, total)}%</span>
          </div>
          <div className="mt-1 h-1.5 rounded bg-zinc-100">
            <div className="h-1.5 rounded bg-zinc-400" style={{ width: `${Math.max(1, pct(r.n, total))}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function buildFaq(d: NumberData, pretty: string, v: Verdict): { q: string; a: string }[] {
  const faq: { q: string; a: string }[] = [];
  const place = placeLabel(d);
  if (d.org) {
    faq.push({ q: `Who owns ${pretty}?`, a: `${pretty} is listed as ${d.org.name}${d.org.department ? `, ${d.org.department}` : ""}.` });
  } else if (d.block?.status === "unassigned") {
    faq.push({ q: `Who called me from ${pretty}?`, a: `Nobody can have this number as a working line: its block isn't assigned to any phone carrier (${d.block.source}, ${formatDate(d.block.asOf)}). Callers showing it were most likely spoofing their caller ID.` });
  } else if (d.block?.carrier || place) {
    faq.push({ q: `Who called me from ${pretty}?`, a: `The number belongs to a block assigned to ${d.block?.carrier ?? "a carrier"}${place ? ` in ${place}` : ""} (${d.block?.source}, ${formatDate(d.block!.asOf)}). Numbers can move between carriers, so the caller's provider may differ.` });
  }
  const total = d.ftc.total + d.community.total;
  if (total > 0) {
    faq.push({ q: `Is ${pretty} a scam or spam?`, a: `${v.label}: ${v.reason}` });
    const parts = [];
    if (d.ftc.total) parts.push(`${nf(d.ftc.total)} complaint${d.ftc.total === 1 ? "" : "s"} to the U.S. FTC's Do Not Call registry${d.ftc.first ? ` between ${formatDate(d.ftc.first)} and ${formatDate(d.ftc.last!)}` : ""}`);
    if (d.community.total) parts.push(`${nf(d.community.total)} community report${d.community.total === 1 ? "" : "s"} on Canadial`);
    faq.push({ q: `How many times has ${pretty} been reported?`, a: parts.join(" and ") + "." });
  }
  const top = d.ftc.subjects.find((s) => s.label !== "Not specified / other");
  if (top) faq.push({ q: `What do callers from ${pretty} say?`, a: `The most common complaint category is "${top.label}" (${pct(top.n, d.ftc.total)}% of FTC complaints).` });
  return faq;
}

export default async function NumberPage({ params }: Props) {
  const { number: raw } = await params;
  const n = canonicalOrExit(raw);
  const d = await getData(n);
  const pretty = formatPhone(n);
  const v = verdict(d);
  const place = placeLabel(d);
  const code = n.slice(0, 3);
  const nxx = n.slice(3, 6);
  const faq = buildFaq(d, pretty, v);
  const totalTypes = Object.values(d.community.types).reduce((a, b) => a + b, 0);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", name: `${pretty} phone number lookup`, url: `${SITE_URL}/lookup/${n}` },
      faq.length
        ? { "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }
        : null,
    ].filter(Boolean),
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Link href="/" className="text-sm text-zinc-500 hover:text-canada">← Back to search</Link>

      <header className="mt-4">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{pretty}</h1>
        {(place || d.tollFree) && (
          <p className="mt-1 text-sm text-zinc-500">{d.tollFree ? "Toll-free number" : place}</p>
        )}
      </header>

      {/* 1. Verdict */}
      <section className={`mt-4 rounded-xl border p-5 ${LEVEL_STYLE[v.level]}`}>
        <div className="text-sm font-semibold uppercase tracking-wide">{v.label}</div>
        <p className="mt-1 text-sm">{v.reason}</p>
      </section>

      {/* 2. Complaint history */}
      {d.ftc.total + d.community.total > 0 && (
        <Section title="Complaint history">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat value={nf(d.ftc.total)} label="FTC complaints" />
            <Stat value={nf(d.community.total)} label="Community reports" />
            {d.ftc.first && <Stat value={formatDate(d.ftc.first)} label="First complaint" />}
            {d.ftc.last && <Stat value={formatDate(d.ftc.last)} label="Latest complaint" />}
          </div>
          {d.ftc.monthly.length > 1 && <div className="mt-4"><MonthlyChart months={d.ftc.monthly} /></div>}
          {d.ftc.total > 0 && (
            <p className="mt-2 text-xs text-zinc-500">
              FTC complaints are filed by consumers with the U.S. Federal Trade Commission&apos;s Do Not Call registry; they aren&apos;t verified by the FTC or by us.
            </p>
          )}
        </Section>
      )}

      {/* 3. What callers claimed */}
      {(d.ftc.subjects.length > 0 || totalTypes > 0) && (
        <Section title="What callers claimed">
          {d.ftc.subjects.length > 0 && (
            <>
              <p className="mb-3 text-sm text-zinc-600">Complaint categories chosen by FTC complainants:</p>
              <Bars rows={d.ftc.subjects} total={d.ftc.total} />
            </>
          )}
          {totalTypes > 0 && (
            <>
              <p className="mb-3 mt-5 text-sm text-zinc-600">Call types in community reports:</p>
              <Bars rows={Object.entries(d.community.types).sort((a, b) => b[1] - a[1]).map(([label, n]) => ({ label, n }))} total={totalTypes} />
            </>
          )}
        </Section>
      )}

      <AdUnit className="mt-8" />

      {/* 4. Origin */}
      <Section title="Where the number is from">
        {d.tollFree ? (
          <p className="text-sm text-zinc-700">
            {pretty} is a toll-free number. Toll-free numbers aren&apos;t tied to a place, and no public record shows which company holds them.
          </p>
        ) : d.block?.status === "unassigned" ? (
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
            <strong>The caller ID was likely spoofed.</strong> {pretty} is in a block that isn&apos;t assigned to any phone carrier ({d.block.source} records, {formatDate(d.block.asOf)}), so no working line can have this number. Scam callers often fake caller IDs like this.
          </p>
        ) : d.block ? (
          <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            {place && <div><dt className="text-zinc-500">Location of the number block</dt><dd className="font-medium">{place}{d.block.country === "CA" ? ", Canada" : ", USA"}</dd></div>}
            {d.block.carrier && <div><dt className="text-zinc-500">Block assigned to</dt><dd className="font-medium">{d.block.carrier}</dd></div>}
            <p className="text-xs text-zinc-500 sm:col-span-2">
              From {d.block.source === "CNAC" ? "the Canadian Numbering Administrator" : "the North American Numbering Plan Administrator"} ({formatDate(d.block.asOf)}). This is who the number block was assigned to; numbers can be moved between carriers, and caller IDs can be faked.
            </p>
          </dl>
        ) : (
          <p className="text-sm text-zinc-600">There is no Canadian or U.S. numbering record for this area code.</p>
        )}
        {d.ftc.states.length > 0 && (
          <div className="mt-5">
            <p className="mb-3 text-sm text-zinc-600">Where FTC complainants were located (U.S. states):</p>
            <Bars rows={d.ftc.states.map((s) => ({ label: s.state, n: s.n }))} total={d.ftc.total} />
          </div>
        )}
      </Section>

      {/* 5. Same block */}
      {d.neighbours.length > 0 && (
        <Section title={`Other reported numbers in ${code}-${nxx}`}>
          <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 text-sm">
            {d.neighbours.map((x) => (
              <li key={x.phone}>
                <Link href={`/lookup/${x.phone}`} className="flex justify-between px-3 py-2 hover:bg-zinc-50">
                  <span className="font-medium">{formatPhone(x.phone)}</span>
                  <span className="text-zinc-500">{nf(x.complaints)} complaint{x.complaints === 1 ? "" : "s"}</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link href={`/area/${code}/${nxx}`} className="mt-2 inline-block text-sm text-canada hover:underline">
            All reported numbers in {code}-{nxx} →
          </Link>
        </Section>
      )}

      {/* 6 + 7. Search count and "did this number call you?" (client-side: the page is edge-cached) */}
      <NumberActivity phone={n} pretty={pretty} />

      {/* Recent community reports */}
      <Section title="Recent community reports" id="reports">
        {d.community.recent.length > 0 ? (
          <ul className="space-y-3">
            {d.community.recent.map((r) => {
              const src = reportSource(r);
              return (
                <li key={r.id} className="rounded-lg border border-zinc-200 p-3 text-sm">
                  <div className="flex flex-wrap justify-between gap-2 text-xs text-zinc-500">
                    <span>{src.label}{r.type ? ` · ${r.type}` : ""}</span>
                    <span>{src.imported ? `imported ${formatDate(r.createdAt)}` : formatDate(r.createdAt)}</span>
                  </div>
                  {r.comment && <p className="mt-1 text-zinc-800">{r.comment.replace(/\s*Reported on 800notes\.com\.?\s*$/i, "")}</p>}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-zinc-600">No community reports yet.</p>
        )}
        <div className="mt-4">
          <ReportForm phoneNumber={n} />
        </div>
      </Section>

      {/* 8. What to do */}
      <Section title="What to do">
        <ul className="list-disc space-y-2 pl-5 text-sm text-zinc-700">
          <li>Don&apos;t share personal or banking details, or pay anyone, on a call you didn&apos;t expect. Hang up and call the organization back on a number you find yourself.</li>
          <li><strong>Block it:</strong> on iPhone, open Recents, tap ⓘ next to the number, then “Block this Caller”. On Android, open the Phone app, long-press the number in recent calls, then “Block”.</li>
          <li><strong>Report fraud</strong> to the <a className="text-canada underline" href="https://antifraudcentre-centreantifraude.ca/" rel="noopener noreferrer" target="_blank">Canadian Anti-Fraud Centre</a> (1-888-495-8501).</li>
          <li><strong>Report telemarketing</strong> to the <a className="text-canada underline" href="https://lnnte-dncl.gc.ca/" rel="noopener noreferrer" target="_blank">National Do Not Call List</a> if you&apos;re registered and still got the call.</li>
          <li>Add a report above so others can see it.</li>
        </ul>
      </Section>

      {/* 9. FAQ from this number's data */}
      {faq.length > 0 && (
        <Section title="Questions about this number">
          <dl className="divide-y divide-zinc-200 rounded-xl border border-zinc-200">
            {faq.map(({ q, a }) => (
              <div key={q} className="p-4">
                <dt className="font-medium text-zinc-900">{q}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-zinc-600">{a}</dd>
              </div>
            ))}
          </dl>
        </Section>
      )}

      {/* 10. Data updated */}
      <p className="mt-8 text-xs text-zinc-500">
        Data updated: FTC complaints through {d.ftcDataThrough ? formatDate(d.ftcDataThrough) : "—"}
        {d.block ? `; numbering records as of ${formatDate(d.block.asOf)}` : ""}; community reports live.{" "}
        <Link href="/methodology" className="underline">How this page is built</Link>.
      </p>
    </div>
  );
}
