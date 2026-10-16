import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HUBS, hubBySlug } from "@/lib/hubs";
import { getHub } from "@/lib/hub-data";
import NumberList from "@/components/NumberList";

export const revalidate = 86400; // rebuilt once a day by the refresh
export const dynamicParams = false;
export function generateStaticParams() {
  return HUBS.map((h) => ({ slug: h.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const hub = hubBySlug((await params).slug);
  if (!hub) return {};
  const { stats } = await getHub(hub.slug);
  return {
    title: hub.title,
    description: `${hub.summary}${stats ? ` ${stats.complaints.toLocaleString("en-CA")} FTC complaints about ${stats.numbers.toLocaleString("en-CA")} numbers.` : ""}`,
    alternates: { canonical: `/scams/${hub.slug}` },
  };
}

export default async function HubPage({ params }: Props) {
  const hub = hubBySlug((await params).slug);
  if (!hub) notFound();
  const { stats, numbers } = await getHub(hub.slug);
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <Link href="/scams" className="text-sm text-zinc-500 hover:text-canada">← All call types</Link>
      <h1 className="mt-3 text-3xl font-bold">{hub.title}</h1>
      <p className="mt-2 text-zinc-600">{hub.summary}</p>
      {stats && (
        <p className="mt-4 text-sm text-zinc-700">
          <strong>{stats.complaints.toLocaleString("en-CA")}</strong> FTC complaints in this category, about{" "}
          <strong>{stats.numbers.toLocaleString("en-CA")}</strong> different numbers. FTC category: “{hub.subjects.join("”, “").replace(/\s+&/g, " &")}”.
        </p>
      )}
      <h2 className="mt-8 text-lg font-semibold">Most-reported numbers in this category</h2>
      {numbers.length ? (
        <div className="mt-3">
          <NumberList rows={numbers.map((n) => ({ phone: n.phone, count: n.inCategory, note: "complaints" }))} />
        </div>
      ) : (
        <p className="mt-3 text-sm text-zinc-600">No number has more than four complaints in this category.</p>
      )}
      <p className="mt-6 text-xs text-zinc-500">
        Counts are complaints filed with the U.S. Federal Trade Commission; they aren&apos;t verified. <Link className="underline" href="/methodology">Methodology</Link>.
      </p>
    </div>
  );
}
