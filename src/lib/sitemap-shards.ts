import { LOCALES } from "./i18n";

// Each sitemap shard holds at most CHUNK_SIZE number-pages, well under Google's
// 50,000-URL limit. Shards are: one "core" shard (homepage, language homes,
// area pages) plus one shard per (locale × number-chunk). This scales to any
// database size — more numbers simply means more chunks.
export const CHUNK_SIZE = 10000;

export type Shard =
  | { kind: "core" }
  | { kind: "lookup"; code: string; chunk: number };

// Deterministic, ordered shard list for a given number count. Both
// generateSitemaps() and the sitemap()/robots() functions derive shards from
// this so their ids line up.
export function planShards(totalNumbers: number): Shard[] {
  const chunkCount = Math.max(1, Math.ceil(totalNumbers / CHUNK_SIZE));
  const shards: Shard[] = [{ kind: "core" }];
  for (const loc of LOCALES) {
    for (let chunk = 0; chunk < chunkCount; chunk++) {
      shards.push({ kind: "lookup", code: loc.code, chunk });
    }
  }
  return shards;
}

// URL path prefix for a locale's lookup pages ("" for English → /lookup/...).
export function lookupPrefix(code: string): string {
  return code === "en" ? "" : `/${code}`;
}
