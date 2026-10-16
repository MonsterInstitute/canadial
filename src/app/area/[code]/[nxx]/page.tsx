import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getBlock } from "@/lib/hub-data";
import { carrierLabel, formatDate } from "@/lib/number-data";
import { isValidAreaCode } from "@/lib/phone";
import NumberList from "@/components/NumberList";

// One NPA-NXX block (e.g. 416-555): who it is assigned to, where, and the
// reported numbers in it. Rendered on demand and edge-cached by worker.ts.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ code: string; nxx: string }> };
const load = cache(getBlock);

function parse(code: string, nxx: string): number | null {
  if (!isValidAreaCode(code) || !/^[2-9]\d\d$/.test(nxx)) return null;
  return Number(code) * 1000 + Number(nxx);
}

// A proper place name: CNAC's exchange area (Canada) or the Census match for
// NANPA's rate centre (US). Unmatched US rate centres are shown separately,
// labelled, never as a city.
type BlockRow = NonNullable<Awaited<ReturnType<typeof getBlock>>["block"]>;
const placeOf = (b: BlockRow | null) => {
  const city = b ? (b.country === "CA" ? b.rate_center : b.place) : null;
  return city ? `${city}, ${b!.region}` : null;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code, nxx } = await params;
  const key = parse(code, nxx);
  if (!key) return {};
  const { block, numbers } = await load(key);
  if (!block && !numbers.length) return {};
  const place = placeOf(block);
  const carrier = carrierLabel(block?.carrier ?? null);
  return {
    title: `${code}-${nxx} phone numbers${place ? ` — ${place}` : ""}`,
    description:
      block?.status === "assigned"
        ? `${code}-${nxx} is assigned to ${carrier ?? "a carrier"}${place ? ` in ${place}` : ""}. ${numbers.length} reported number${numbers.length === 1 ? "" : "s"} listed.`
        : `${code}-${nxx} isn't assigned to any carrier: calls showing these numbers use spoofed caller IDs. ${numbers.length} reported numbers listed.`,
    alternates: { canonical: `/area/${code}/${nxx}` },
  };
}

export default async function BlockPage({ params }: Props) {
  const { code, nxx } = await params;
  const key = parse(code, nxx);
  if (!key) notFound();
  const { block, xblocks, numbers } = await load(key);
  if (!block && !numbers.length) notFound();
  const place = placeOf(block);
  const rateCentre = !place && block?.country === "US" && block.rate_center ? `${block.rate_center}, ${block.region}` : null;
  const carrier = carrierLabel(block?.carrier ?? null);
  const pooledOthers = xblocks.filter((x) => x.status === "assigned");
  const unassignedX = xblocks.filter((x) => x.status === "available").map((x) => `${code}-${nxx}-${x.npanxxx % 10}xxx`);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <Link href={`/area/${code}`} className="text-sm text-zinc-500 hover:text-canada">← Area code {code}</Link>
      <h1 className="mt-3 text-3xl font-bold">{code}-{nxx} phone numbers</h1>
      {block?.status === "assigned" ? (
        <p className="mt-2 text-zinc-700">
          Numbers {code}-{nxx}-0000 to {code}-{nxx}-9999 are assigned to <strong>{carrier ?? "a carrier"}</strong>
          {place ? <> in <strong>{place}</strong></> : rateCentre ? <> (rate centre <strong>{rateCentre}</strong>, NANPA abbreviation)</> : null}.
          {pooledOthers.length > 0 && ` ${pooledOthers.length} of its ten thousand-number blocks are assigned to other carriers (number pooling).`}
        </p>
      ) : (
        <p className="mt-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          {code}-{nxx} isn&apos;t assigned to any phone carrier. No working line can have one of these numbers, so calls showing them use spoofed caller IDs.
        </p>
      )}
      {unassignedX.length > 0 && block?.status === "assigned" && (
        <p className="mt-2 text-sm text-zinc-600">Not assigned to any carrier: {unassignedX.join(", ")} — calls from these use spoofed caller IDs.</p>
      )}
      {block && <p className="mt-2 text-xs text-zinc-500">Source: {block.source === "CNAC" ? "Canadian Numbering Administrator" : "North American Numbering Plan Administrator"}, {formatDate(block.as_of)}. Numbers can move between carriers.</p>}

      <h2 className="mt-8 text-lg font-semibold">Reported numbers in {code}-{nxx}</h2>
      {numbers.length ? (
        <div className="mt-3">
          <NumberList rows={numbers.map((n) => ({ phone: String(n.phone), count: n.ftc_total + n.c_total, note: "complaints" }))} />
          {numbers.length === 50 && <p className="mt-2 text-xs text-zinc-500">Showing the 50 most-reported.</p>}
        </div>
      ) : (
        <p className="mt-3 text-sm text-zinc-600">No number in this block has complaints or reports.</p>
      )}
    </div>
  );
}
