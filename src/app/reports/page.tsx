import type { Metadata } from "next";
import Link from "next/link";
import { getReportableMonths, monthName } from "@/lib/reports";

export const revalidate = 86400; // daily

export const metadata: Metadata = {
  title: "Canadian Spam Call Reports",
  description:
    "Monthly reports on spam, scam and robocall trends in Canada, based on Canadial's community-reported number database.",
  alternates: { canonical: "/reports" },
};

export default async function ReportsIndex() {
  const months = await getReportableMonths();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
      <header>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Canadian Spam Call Reports
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-zinc-700">
          Each month we summarize spam, scam, and robocall trends across Canada
          from numbers reported to Canadial&apos;s community database.
        </p>
      </header>

      <section className="mt-10">
        {months.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-zinc-500">
            No reports available yet.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200">
            {months.map(({ year, month }) => {
              const mm = String(month).padStart(2, "0");
              return (
                <li key={`${year}-${mm}`}>
                  <Link
                    href={`/reports/${year}/${mm}`}
                    className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-zinc-50"
                  >
                    <span className="font-semibold text-zinc-900">
                      {monthName(year, month)} Canadian Spam Call Report
                    </span>
                    <span aria-hidden className="text-canada">
                      →
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
