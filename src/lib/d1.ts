import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// D1 access for server code. Three rules, all from AGENTS.md:
//
//  * Errors throw. A failed read is never "no data" — that is how an outage
//    got cached as "No reports yet" on Supabase.
//  * Every query has a deadline. A D1 binding has no connection to time out,
//    but a stuck query would still hold the request (and its CPU/memory
//    billing) open, so each call races a timer and fails fast.
//  * Every query is metered. D1 bills rows read, and rows read per render is
//    the number that decides whether a full crawl is affordable. The worker
//    entry (worker.ts) opens a meter per request and reports the totals in
//    the x-d1-rows-read / x-d1-queries response headers.

const QUERY_DEADLINE_MS = 5_000;

export type D1Meter = { rowsRead: number; rowsWritten: number; queries: number };

// Shared through globalThis: worker.ts and the Next server bundle are separate
// module graphs in the same isolate, and both must see the same store.
const g = globalThis as typeof globalThis & { __d1Meter?: AsyncLocalStorage<D1Meter> };
export const d1Meter: AsyncLocalStorage<D1Meter> = (g.__d1Meter ??= new AsyncLocalStorage<D1Meter>());

// Async mode: the sync form throws inside statically rendered (ISR) routes.
async function db(): Promise<D1Database> {
  const { env } = await getCloudflareContext({ async: true });
  const d1 = (env as { DB?: D1Database }).DB;
  if (!d1) throw new Error("D1 binding DB is not configured");
  return d1;
}

async function withDeadline<T>(what: string, p: Promise<T>, ms = QUERY_DEADLINE_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`D1 query exceeded ${ms}ms: ${what.slice(0, 120)}`)),
      ms
    );
  });
  try {
    return await Promise.race([p, deadline]);
  } finally {
    clearTimeout(timer);
  }
}

function meter(meta: D1Meta | undefined) {
  const m = d1Meter.getStore();
  if (!m || !meta) return;
  m.queries += 1;
  m.rowsRead += meta.rows_read ?? 0;
  m.rowsWritten += meta.rows_written ?? 0;
}

export type Query = { sql: string; params?: unknown[] };

// Run several statements in one round trip. Results come back in order.
export async function batch<T extends unknown[]>(
  queries: { [K in keyof T]: Query }
): Promise<{ [K in keyof T]: T[K][] }> {
  const d = await db();
  const stmts = queries.map((q) => d.prepare(q.sql).bind(...(q.params ?? [])));
  const results = await withDeadline(queries[0]?.sql ?? "batch", d.batch(stmts));
  for (const r of results) meter(r.meta);
  return results.map((r) => r.results) as { [K in keyof T]: T[K][] };
}

export async function all<T>(sql: string, ...params: unknown[]): Promise<T[]> {
  const res = await withDeadline(sql, (await db()).prepare(sql).bind(...params).all<T>());
  meter(res.meta);
  return res.results;
}

export async function first<T>(sql: string, ...params: unknown[]): Promise<T | null> {
  const rows = await all<T>(sql, ...params);
  return rows[0] ?? null;
}

// A write or maintenance statement. `deadlineMs` is for the rollup refreshes,
// which aggregate whole tables (seconds, by design, and never on a page
// render); everything a page or form runs keeps the default.
export async function run(
  sql: string,
  params: unknown[] = [],
  deadlineMs = QUERY_DEADLINE_MS
): Promise<{ rowsRead: number; rowsWritten: number; changes: number }> {
  const res = await withDeadline(sql, (await db()).prepare(sql).bind(...params).run(), deadlineMs);
  meter(res.meta);
  return {
    rowsRead: res.meta.rows_read ?? 0,
    rowsWritten: res.meta.rows_written ?? 0,
    changes: res.meta.changes ?? 0,
  };
}
