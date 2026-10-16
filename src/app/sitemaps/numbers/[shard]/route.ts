import { notFound } from "next/navigation";
import { numberShardEntries, getShards, shardParam, urlset } from "@/lib/sitemap-data";

// One shard of numbers pages (up to 45,000 URLs), e.g. /sitemaps/numbers/0.xml.
// A partial-index range read; rebuilt daily.
export const revalidate = 86400;
export function generateStaticParams() {
  return [];
}

export async function GET(_req: Request, { params }: { params: Promise<{ shard: string }> }) {
  const n = shardParam((await params).shard);
  const shard = n === null ? undefined : (await getShards()).find((s) => s.kind === "numbers" && s.shard === n);
  if (!shard) notFound();
  return urlset(await numberShardEntries(shard.first, shard.last));
}
