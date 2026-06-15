import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import { supabase } from "@/lib/supabase";
import { formatPhone } from "@/lib/lookup";
import { SITE_TAGLINE } from "@/lib/config";

// Refresh the recent-reports list periodically.
export const revalidate = 60;

type RecentReport = {
  id: string | number;
  phone_number: string;
  type: string | null;
  comment: string | null;
  is_spam: boolean | null;
  created_at: string;
};

async function getRecentReports(): Promise<RecentReport[]> {
  try {
    const { data, error } = await supabase
      .from("spam_reports")
      .select("id, phone_number, type, comment, is_spam, created_at")
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

export default async function Home() {
  const reports = await getRecentReports();

  return (
    <div className="mx-auto w-full max-w-3xl px-4">
      <section className="flex flex-col items-center py-16 text-center sm:py-24">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-canada">
          🍁 Made for Canada
        </div>
        <h1 className="mb-3 max-w-2xl text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          {SITE_TAGLINE}
        </h1>
        <p className="mb-8 max-w-xl text-zinc-600">
          Enter a phone number to see if it&apos;s spam, a scam, or a legitimate
          business.
        </p>
        <div className="w-full max-w-xl">
          <SearchBar autoFocus />
        </div>
      </section>

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
