import Link from "next/link";
import { formatPhone } from "@/lib/phone";

// A plain list of numbers with a count, linking to each number's page.
export default function NumberList({ rows }: { rows: { phone: string; count: number; note?: string }[] }) {
  return (
    <ol className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 text-sm">
      {rows.map((r, i) => (
        <li key={r.phone}>
          <Link href={`/lookup/${r.phone}`} className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-zinc-50">
            <span className="flex items-center gap-3">
              <span className="w-6 text-right text-xs text-zinc-400">{i + 1}</span>
              <span className="font-medium">{formatPhone(r.phone)}</span>
            </span>
            <span className="text-right text-zinc-500">
              {r.count.toLocaleString("en-CA")}
              {r.note ? <span className="ml-1 text-xs">{r.note}</span> : null}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
