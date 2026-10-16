<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

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

5. **The sitemap lists every page with data unique to it, in shards.**
   `/sitemap.xml` is a sitemap index: `/sitemaps/core.xml` (hubs, reports,
   area codes, trust pages, organizations) plus `/sitemaps/numbers/<n>.xml`
   and `/sitemaps/blocks/<n>.xml`, at most 45,000 URLs each. Which numbers
   are listed is `numbers.listed`, set by the "sitemap" refresh part (see
   LISTED in `src/lib/refresh.ts`): 2+ complaints or reports, any community
   report, or a single complaint in an unassigned block. Shard boundaries are
   materialized in `sitemap_shards`, so a shard is one partial-index range.
   `lastmod` is always a real data date.

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

`.github/workflows/daily-import.yml` runs at 08:00 UTC:

1. **FTC** (`scripts/ftc_daily.py`): for each of the last 7 days,
   `/api/admin/ftc/fetch` stores that day's `DNC_Complaint_Numbers_<day>.csv`
   byte for byte in `r2://canadial-data/ftc/raw/<yyyy>/` (the Worker fetches
   it: ftc.gov serves Cloudflare but answers scripted clients elsewhere with an
   HTML "404"), then `/api/admin/ftc/ingest` adds it to the aggregates. Each
   day is applied once, atomically, with its `ftc_ingest_log` row.
2. ReverseCanada import.
3. `/api/admin/refresh` (counters and rollups; write-guarded, ~1.4k rows
   written per run, plus a few hundred for campaigns and block summaries).
4. `scripts/revalidate_pages.py`.

All writes go through the admin API: the workflow holds `ADMIN_TOKEN` and
`REVALIDATE_SECRET` and no database credentials.

## FTC data

Per-number aggregates of every FTC Do Not Call complaint since the archive
starts (2022-05-27): `numbers.ftc_total/ftc_robocall/ftc_first/ftc_last`,
`ftc_monthly`, `ftc_states`, `ftc_subjects`, and small JSON breakdowns on
`numbers` (migration 0007): `ftc_hours` (hour of call; exact 00:00 and 12:00
dropped as form defaults), `ftc_wdays`, `ftc_cities` (top 10, cut after every
day), `ftc_local` (complainant area code = the number's). The daily ingest
merges them in SQL inside the same transaction. Raw files in R2 are the source of
truth; `scripts/ftc_download_raw.py` + `scripts/ftc_aggregate.py` rebuild every
aggregate from them. The rules (row dedupe across the previous 7 files, date
formats, call-date sanity) live in both `scripts/ftc_aggregate.py` and
`src/lib/ftc-ingest.ts` and must stay identical — they were verified to produce
identical rows on real files.

Derived from them by the refresh: `block_summaries` (FTC totals per NPA-NXX,
"areas" part) and `campaigns` + `numbers.campaign` ("campaigns" part,
`src/lib/campaigns.ts`): same block, same main subject, first complaints in a
chain at most 3 days apart, Poisson p < 1e-9 against the area code's rate.
Measured against a shuffled-block control, ~15% of grouped numbers would
appear by chance, so pages describe a group and call it likely, never certain.
Generic subjects are matched by name, not id (ids differ between databases).

The old one-row-per-number FTC rows (`reports.source = 'ftc_dnc'`) still back
the current number pages; they are deleted when the pages switch to the
aggregates (Phase 4), never counted alongside them.

## Number-block data

`number_blocks` (one row per NPA-NXX) and `number_blocks_x` (US thousands-
blocks that differ from their code holder, or are unassigned) come from CNAC's
CO Code Status (Canada) and NANPA's CO code and thousands-block assignment
records (US). Raw zips live in `r2://canadial-data/blocks/raw/<date>/`;
`scripts/blocks_build.py` turns them into SQL that replaces both tables. A row
is the carrier the *block* was assigned to; with number portability a number
may since have moved, so pages say "assigned to", never "this number's
carrier". Neither source states a licence; pages attribute both by name and
date. Refresh monthly: download the four zips, store them in R2 under the new
date, run the builder, execute its SQL with `wrangler d1 execute --remote`.

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
