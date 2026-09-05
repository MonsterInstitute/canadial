import type { Metadata } from "next";
import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import SloganRotator from "@/components/SloganRotator";
import AdUnit from "@/components/AdUnit";
import CanadaHeatmap from "@/components/CanadaHeatmap";
import NewUiBanner from "@/components/app/NewUiBanner";
import { supabaseAdmin } from "@/lib/supabase";
import { formatPhone } from "@/lib/lookup";
import { getSiteStats, getTrendingNumbers } from "@/lib/spam";
import { regionForCode } from "@/lib/area-codes";
import { HREFLANG_ALTERNATES } from "@/lib/i18n";

export const metadata: Metadata = {
  alternates: { canonical: "/", languages: HREFLANG_ALTERNATES },
};

// Hourly. get_site_stats() runs count(distinct) over the whole table — measured
// at ~673k rows scanned per call — so a 5-minute window meant ~193M rows/day of
// scanning for numbers that only move when the daily import lands. Freshness
// doesn't depend on this window anyway: submitReport() calls revalidatePath("/"),
// so a new community report shows up immediately.
export const revalidate = 3600;

// The homepage aggregates over the full spam_reports table (get_site_stats runs
// several count(distinct) scans, ~9s on a 300k-row table). Give the render enough
// headroom to finish so background ISR regeneration reliably replaces the cached
// page instead of timing out and freezing a stale/degraded prerender.
export const maxDuration = 60;

type RecentReport = {
  id: string | number;
  phone_number: string;
  type: string | null;
  comment: string | null;
  is_spam: boolean | null;
  created_at: string;
};

async function getRecentReports(): Promise<RecentReport[]> {
  // Filter on is_spam so this hits the same index as the "Trending" query. An
  // unfiltered `order by created_at` is a full sort of the whole table, which
  // loses to the DB contention created when the build prerenders hundreds of
  // pages at once — that's what left this list empty ("No reports yet") even
  // though the data was there. Retry a couple of times to ride out transient
  // load before giving up.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { data, error } = await supabaseAdmin
        .from("spam_reports")
        .select("id, phone_number, type, comment, is_spam, created_at")
        .eq("is_spam", true)
        .eq("hidden", false)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) {
        console.error(
          `getRecentReports attempt ${attempt + 1} failed:`,
          error.message
        );
      } else if (data && data.length > 0) {
        return data;
      }
    } catch (e) {
      console.error(`getRecentReports attempt ${attempt + 1} threw:`, e);
    }
    // Brief backoff before retrying.
    await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
  }
  return [];
}

// Province labels are stored long ("Nova Scotia / PEI"); trim to something that
// fits a stat tile.
function shortProvince(name: string): string {
  return name.replace(" & ", " & ").split(" / ")[0];
}

// A short, human date for the trending strip, e.g. "Jul 2".
function shortDate(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

function StatTile({
  value,
  label,
}: {
  value: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center px-4 py-3 text-center">
      <span className="text-2xl font-bold text-zinc-900 sm:text-3xl">
        {value}
      </span>
      <span className="mt-0.5 text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </span>
    </div>
  );
}

export default async function Home() {
  const [reports, stats, trending] = await Promise.all([
    getRecentReports(),
    getSiteStats(),
    getTrendingNumbers(5),
  ]);

  // Every area code with data, busiest first — gives crawlers a path to all
  // area-code pages, and from there to every individual number page.
  const areaCodes = Object.entries(stats.areaCodeCounts).sort(
    (a, b) => b[1] - a[1]
  );

  const hasProvinceData =
    Object.values(stats.provinceCounts).some((c) => c > 0);

  return (
    <div className="mx-auto w-full max-w-3xl px-4">
      {/* Entry point to the parallel /app UI. Client-side dismissable; renders
          nothing once dismissed. */}
      <div className="pt-4">
        <NewUiBanner />
      </div>

      <section className="flex flex-col items-center py-16 text-center sm:py-24">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-canada">
          🍁 Made for Canada
        </div>
        <h1 className="mb-3 max-w-2xl text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          <SloganRotator />
        </h1>
        <p className="mb-8 max-w-xl text-zinc-600">
          Enter a phone number to see if it&apos;s spam, a scam, or a legitimate
          business.
        </p>
        <div className="w-full max-w-xl">
          <SearchBar autoFocus />
        </div>
      </section>

      {/* Live stats — gives the homepage concrete, unique numbers that update as
          the database grows. */}
      {stats.totalNumbers > 0 && (
        <section className="mb-12 -mt-6">
          <div className="grid grid-cols-1 divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <StatTile
              value={stats.totalNumbers.toLocaleString("en-CA")}
              label="Numbers tracked"
            />
            <StatTile
              value={stats.mostCommonType ?? "—"}
              label="Most reported type"
            />
            <StatTile
              value={
                stats.topProvince ? shortProvince(stats.topProvince.name) : "—"
              }
              label="Most active province"
            />
          </div>
        </section>
      )}

      {/* Trending this week — the newest reported numbers, with a type badge. */}
      {trending.length > 0 && (
        <section className="pb-12">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-xl font-semibold text-zinc-900">
              🔥 Trending this week
            </h2>
            <span className="text-xs text-zinc-500">
              Newest reported numbers
            </span>
          </div>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {trending.map((t) => (
              <li key={t.phone_number}>
                <Link
                  href={`/lookup/${t.phone_number}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 px-4 py-3 transition-colors hover:border-canada hover:bg-red-50"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-zinc-900">
                      {formatPhone(t.phone_number)}
                    </div>
                    {shortDate(t.created_at) && (
                      <div className="text-xs text-zinc-400">
                        Reported {shortDate(t.created_at)}
                      </div>
                    )}
                  </div>
                  <span className="shrink-0 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-canada">
                    {t.type || "Spam"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Where spam is being reported across Canada. */}
      {hasProvinceData && (
        <section className="pb-12">
          <h2 className="mb-1 text-xl font-semibold text-zinc-900">
            Spam reports across Canada
          </h2>
          <p className="mb-4 text-sm text-zinc-600">
            Provinces shaded by how many numbers Canadians have reported.
            {stats.topProvince ? (
              <>
                {" "}
                <strong className="text-zinc-800">
                  {shortProvince(stats.topProvince.name)}
                </strong>{" "}
                leads with {stats.topProvince.count.toLocaleString("en-CA")}{" "}
                reported number
                {stats.topProvince.count === 1 ? "" : "s"}.
              </>
            ) : null}
          </p>
          <div className="rounded-2xl border border-zinc-200 p-4 sm:p-6">
            <CanadaHeatmap provinceCounts={stats.provinceCounts} />
          </div>
        </section>
      )}

      {areaCodes.length > 0 && (
        <section className="pb-12">
          <h2 className="mb-4 text-xl font-semibold text-zinc-900">
            Browse by area code
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {areaCodes.map(([code, count]) => {
              const region = regionForCode(code);
              return (
                <Link
                  key={code}
                  href={`/area/${code}`}
                  className="flex flex-col rounded-lg border border-zinc-200 px-4 py-3 transition-colors hover:border-canada hover:bg-red-50"
                >
                  <span className="text-lg font-bold text-zinc-900">{code}</span>
                  {region && (
                    <span className="truncate text-xs text-zinc-500">
                      {region}
                    </span>
                  )}
                  <span className="mt-1 text-xs font-medium text-canada">
                    {count} number{count === 1 ? "" : "s"}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <AdUnit className="pb-8" />

      <section id="recent-reports" className="pb-8">
        <h2 className="mb-4 text-xl font-semibold text-zinc-900">
          Latest spam reports
        </h2>
        {reports.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-zinc-500">
            No reports yet. Be the first to report a number.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200">
            {reports.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/lookup/${r.phone_number}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-zinc-50"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-zinc-900">
                      {formatPhone(r.phone_number)}
                    </div>
                    {r.comment && (
                      <p className="truncate text-sm text-zinc-500">
                        {r.comment}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-canada">
                    {r.type || "Spam"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
