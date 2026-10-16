import type { Metadata } from "next";
import Link from "next/link";
import { getTrending } from "@/lib/hub-data";
import { formatDate } from "@/lib/number-data";
import { formatPhone } from "@/lib/phone";
import NumberList from "@/components/NumberList";

// Changes when a new FTC file is ingested (once a weekday) or a community
// report arrives; an hour keeps it current without re-rendering per request.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Trending spam numbers today",
  description: "The numbers with the most new FTC complaints in the latest daily data, and the newest community reports.",
  alternates: { canonical: "/trending" },
};

export default async function TrendingPage() {
  const { day, numbers, recent } = await getTrending();
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold">Trending numbers</h1>
      {day && (
        <p className="mt-2 text-zinc-600">
          Numbers with the most complaints in the FTC&apos;s latest daily file ({formatDate(day)}). A number marked “new” had no FTC complaints before that file.
        </p>
      )}
      <div className="mt-6">
        <NumberList
          rows={numbers.map((r) => ({
            phone: String(r.phone),
            count: r.n,
            // All of the number's complaints are in this file: it's new.
            note: r.ftc_total === r.n ? "complaints · new" : "complaints",
          }))}
        />
      </div>
      {recent.length > 0 && (
        <>
          <h2 className="mt-10 text-lg font-semibold">Newest community reports</h2>
          <ul className="mt-3 divide-y divide-zinc-100 rounded-lg border border-zinc-200 text-sm">
            {recent.map((r, i) => (
              <li key={`${r.phone}-${i}`}>
                <Link href={`/lookup/${r.phone}`} className="flex justify-between px-3 py-2 hover:bg-zinc-50">
                  <span className="font-medium">{formatPhone(String(r.phone))}</span>
                  <span className="text-zinc-500">{r.type ?? "Report"} · {formatDate(r.created_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
