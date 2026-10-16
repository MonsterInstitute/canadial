import type { Metadata } from "next";
import Link from "next/link";
import { HUBS } from "@/lib/hubs";
import { all } from "@/lib/d1";

export const revalidate = 86400; // hub stats change once a day, with the import

export const metadata: Metadata = {
  title: "Scam and spam call types",
  description: "Phone numbers grouped by what callers claimed, from FTC Do Not Call complaint categories.",
  alternates: { canonical: "/scams" },
};

export default async function ScamsIndex() {
  const rows = await all<{ hub: string; payload: string }>("SELECT hub, payload FROM hub_stats");
  const stats = new Map(rows.map((r) => [r.hub, JSON.parse(r.payload) as { numbers: number; complaints: number }]));
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold">Call types</h1>
      <p className="mt-2 text-zinc-600">
        Numbers grouped by what callers claimed, using the complaint categories people choose when they report a call to the U.S. FTC&apos;s Do Not Call registry.
      </p>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {HUBS.map((h) => {
          const s = stats.get(h.slug);
          return (
            <li key={h.slug}>
              <Link href={`/scams/${h.slug}`} className="block rounded-xl border border-zinc-200 p-4 hover:border-canada">
                <div className="font-semibold">{h.title}</div>
                {s && <div className="mt-1 text-sm text-zinc-500">{s.complaints.toLocaleString("en-CA")} complaints · {s.numbers.toLocaleString("en-CA")} numbers</div>}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
