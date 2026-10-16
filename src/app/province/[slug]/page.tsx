import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PROVINCE_PAGES } from "@/lib/provinces";
import { regionForCode } from "@/lib/area-codes";
import { getAreaRows } from "@/lib/hub-data";
import NumberList from "@/components/NumberList";

export const revalidate = 86400; // area summaries are rebuilt once a day
export const dynamicParams = false;
export function generateStaticParams() {
  return PROVINCE_PAGES.map((p) => ({ slug: p.slug }));
}

type Props = { params: Promise<{ slug: string }> };
type Area = { number_count: number; report_total: number; top_numbers: { phone_number: string; report_count: number }[] };

async function load(slug: string) {
  const prov = PROVINCE_PAGES.find((p) => p.slug === slug);
  if (!prov) return null;
  const rows = await getAreaRows(prov.codes);
  const areas = rows.map((r) => ({ code: String(r.code), ...(JSON.parse(r.payload) as Area) })).sort((a, b) => b.number_count - a.number_count);
  const numbers = areas.reduce((s, a) => s + a.number_count, 0);
  const complaints = areas.reduce((s, a) => s + a.report_total, 0);
  const top = areas.flatMap((a) => a.top_numbers).sort((a, b) => b.report_count - a.report_count).slice(0, 25);
  return { prov, areas, numbers, complaints, top };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const d = await load((await params).slug);
  if (!d) return {};
  return {
    title: `Spam and scam calls in ${d.prov.name}`,
    description: `${d.numbers.toLocaleString("en-CA")} reported numbers across ${d.prov.name}'s area codes (${d.prov.codes.join(", ")}), with ${d.complaints.toLocaleString("en-CA")} complaints and reports.`,
    alternates: { canonical: `/province/${d.prov.slug}` },
  };
}

export default async function ProvincePage({ params }: Props) {
  const d = await load((await params).slug);
  if (!d) notFound();
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold">Spam and scam calls in {d.prov.name}</h1>
      <p className="mt-2 text-zinc-600">
        {d.numbers.toLocaleString("en-CA")} numbers with {d.prov.name} area codes have FTC complaints or community reports ({d.complaints.toLocaleString("en-CA")} in total).
      </p>
      <h2 className="mt-8 text-lg font-semibold">Area codes</h2>
      <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {d.areas.map((a) => (
          <li key={a.code}>
            <Link href={`/area/${a.code}`} className="block rounded-lg border border-zinc-200 p-3 text-sm hover:border-canada">
              <div className="font-semibold">{a.code}</div>
              <div className="text-xs text-zinc-500">{regionForCode(a.code) ?? ""}</div>
              <div className="mt-1 text-xs text-zinc-600">{a.number_count.toLocaleString("en-CA")} numbers</div>
            </Link>
          </li>
        ))}
      </ul>
      <h2 className="mt-8 text-lg font-semibold">Most-reported numbers in {d.prov.name}</h2>
      <div className="mt-3">
        <NumberList rows={d.top.map((t) => ({ phone: t.phone_number, count: t.report_count, note: "complaints" }))} />
      </div>
    </div>
  );
}
