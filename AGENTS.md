<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Architecture

Next.js 16 on Cloudflare Workers via `@opennextjs/cloudflare`. Data in
Cloudflare D1 (`canadial`), ISR cache in R2 (`canadial-opennext-cache`), the
OpenNext tag cache in a second D1 (`canadial-tags`). `worker.ts` is the entry:
it wraps the OpenNext handler with an edge cache for number pages, a D1 meter,
the apex → www redirect, and noindex for non-production hostnames.

Until October 2026 the site ran on Vercel + Supabase's free tier, which was
taken down three times by **a read path whose cost had no upper bound** — not
user traffic, the site's own rendering. D1 has no egress charge, but the same
rule still decides the bill and the speed, now counted in rows read.

## The design rule

> Every page render reads a bounded, small number of rows that does not grow
> with the data, and the worst case — every page on the site rendering once —
> must stay cheap.

Measured: a number page reads 2–7 D1 rows (org by key, the number's counters
by key, its 5 newest reports off an index, its area summary by key), ~33 ms CPU
at p50, ~1.3 ms when served from the edge cache. Do the arithmetic before
adding a read: number pages are multiplied by ~450k.

## Invariants

1. **Per-render cost must not depend on how much data exists.** Counters live
   on `numbers`; area summaries, site stats and monthly reports are
   materialized (`area_summaries`, `site_stats`, `monthly_reports`) by
   `refreshAll()` in `src/lib/refresh.ts`. Pages read them by primary key.
   Never count or scan at render time.

2. **Aggregate in SQL, never in the app.** Never page raw rows in to reduce
   them in TypeScript — that is what burned the Supabase egress budget
   (`getAllPhoneNumbers()`, then `getMonthlyReport()`).

3. **Number pages are not ISR.** They render on demand (`force-dynamic`) and
   `worker.ts` caches each 200 in the colo's Cache API for a day, keyed on the
   path only (query strings can't mint cache misses). Writes that change a
   number purge it (`src/lib/edge-cache.ts`; cross-colo purge needs the
   `CACHE_PURGE_API_TOKEN` and `CACHE_PURGE_ZONE_ID` secrets). Verify with:

   ```bash
   curl -sI https://www.canadial.com/lookup/4164428848 | grep -iE 'x-edge-cache|x-d1-rows-read'
   ```

4. **No public database access.** D1 is reachable only through the Worker's
   binding. The admin endpoints (`/api/admin/*`) take `ADMIN_TOKEN` (or
   `REVALIDATE_SECRET` for revalidate) and fail closed: unset secret means
   503, never open access.

5. **Keep the crawl surface bounded.** `sitemap.xml` lists core pages, area
   codes and the number pages worth indexing (reported 2+ times, or a verified
   organization) — ~15k URLs, one partial-index read.

6. **A failed read throws; it is never "no data".** `src/lib/d1.ts` throws on
   every error and gives every query a 5 s deadline. An empty result during an
   outage used to be cached and served as "No reports yet". A thrown render is
   never cached; ISR keeps the last good copy. `revalidatePath()` invalidates
   rather than marks stale, so nothing calls it unless it just wrote data.

7. **Builds read production data.** `next build` uses the wrangler `build`
   environment (remote D1), selected by `NEXT_DEV_WRANGLER_ENV` in
   `next.config.ts`; `next dev` uses local D1 and never touches production.

## Moderation

Reports are hidden, never deleted:

```bash
# list what is currently hidden
curl -H "Authorization: Bearer $ADMIN_TOKEN" https://www.canadial.com/api/admin/moderate

# hide a report (find its id in the JSON above, or in D1)
curl -X POST https://www.canadial.com/api/admin/moderate \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"id":"<report uuid>","hidden":true,"reason":"abusive comment"}'

# undo — the same call with hidden:false
```

`ADMIN_TOKEN` is a Worker secret (`wrangler secret put ADMIN_TOKEN`). The
endpoint refreshes the number's counters and its area's rollups, purges the
number page and revalidates the area page and homepage, so a hidden report
disappears immediately.

Why hide instead of delete: a moderation call can be wrong, and a disputed
report is evidence. **No code issues DELETE against `reports`**; D1 Time Travel
(30 days of point-in-time restore) is the backstop.

**Any new query against `reports` must filter `hidden = 0`.**

## Daily cycle

`.github/workflows/daily-import.yml` runs at 08:00 UTC: FTC import (the FTC API,
`FTC_API_KEY`), ReverseCanada import, then `/api/admin/refresh`, then
`scripts/revalidate_pages.py`. All writes go through the admin API, so the
workflow holds `ADMIN_TOKEN` and `REVALIDATE_SECRET` and no database
credentials. The refresh must stay after the importers.

## Watch

`.github/workflows/health.yml` asserts these invariants daily (failure emails
the repo owner): D1 size, rollup freshness, rows read per number-page render
(from the `x-d1-rows-read` header), edge caching, sitemap bounds, real data on
the homepage and a number page. Run it by hand with `gh workflow run health.yml`
after any change to a route that reads the database.

## Deploying

From a clean checkout: `npx opennextjs-cloudflare build && npx opennextjs-cloudflare deploy`.
The build reads production D1. Schema changes go in `migrations/` and are
applied with `npx wrangler d1 migrations apply canadial --remote`.
