<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Egress budget: the constraint that decides this project's uptime

This site runs on Supabase's free tier: ~500 MB storage (currently ~161 MB) and
**5 GB/month egress**. Storage has never been the problem. Egress has taken the
site down twice — the project was flagged `exceed_egress_quota`, then paused
under an org-wide service restriction, and stayed dark for weeks.

Both incidents, and a third near-miss, had the same shape: **a read path whose
cost had no upper bound.** Not user traffic — the site's own rendering.

## The design rule

> Every page render must read a bounded, small amount of data, and the
> worst case — every page on the site rendering once — must fit comfortably
> inside the monthly egress budget.

Do the arithmetic before adding a read. There are ~336k number pages, so the
per-render cost of `/lookup/[number]` is multiplied by 336,000:

| per render | full crawl | verdict |
| ---------- | ---------- | ------- |
| 21 KB      | 7.0 GB     | over budget in a single crawl |
| 1.2 KB     | 0.4 GB     | 12x headroom |

That difference is the entire reason `get_area_summary()` exists.

## Invariants

1. **Per-render cost must not depend on how much data exists.** The area-code
   summary every number page shows is materialized in `area_summaries`, one row
   per code, refreshed nightly by the import workflow (and per-code by the
   moderation endpoint). A render reads one row by primary key — ~2ms whatever
   the code holds. Computing it live meant up to 11,000 rows per render on
   toll-free codes: 210ms for 866, and 45,201 calls in a single crawl burst
   after the sitemap grew. `get_area_summary_live()` still exists and is the
   fallback for codes not yet materialized; it is not the read path.

2. **Aggregate in Postgres, never in the app.** Page code calls an RPC that
   returns the answer (`get_site_stats`, `get_area_code_counts`,
   `get_area_summary`). Never page raw rows in to reduce them in TypeScript —
   that is what `getAllPhoneNumbers()` did, and it is why the sitemap alone
   could burn the monthly budget. Every RPC path keeps a scan fallback so a
   missing migration degrades instead of breaking.

3. **Writing `revalidate` does not mean the page is cached.** A dynamic route
   also needs `generateStaticParams` (returning `[]` is enough) or Next treats
   it as fully dynamic and silently ignores `revalidate`. `/lookup/[number]`
   shipped that way and re-queried the database on *every single request*.
   After deploying any route that reads the database, verify:

   ```bash
   curl -sI https://www.canadial.com/<path> | grep -i x-vercel-cache
   # HIT or PRERENDER = cached. MISS on a repeat hit, or
   # `cache-control: private, no-cache, no-store`, means it is NOT cached.
   ```

4. **No public database access.** `spam_reports` and `organizations` grant
   nothing to `anon`/`authenticated`; all reads and writes go through
   `supabaseAdmin` (service role) in server components and server actions. An
   open anon policy lets anyone page the tables straight through PostgREST,
   bypassing every cache and limit here. The anon client in `src/lib/supabase.ts`
   is exported but must stay unused.

5. **Keep the crawl surface bounded.** `sitemap.xml` lists core pages and area
   codes (~790 URLs) — never individual number pages. The ~336k number pages
   are reachable through area-page links; that is enough. Listing them once
   meant ~3.3M URLs across 11 locales, which forced the sitemap to shard, and
   every shard re-scanned the whole table.

6. **Don't remove the daily import.** A free-tier project pauses after 7 days
   of inactivity. Reads are now almost entirely cache-served, so
   `.github/workflows/daily-import.yml` doubles as the keep-alive.

## Moderation

The report form takes free text, so some comment will eventually have to come
down — abuse, a doxxed detail, a business disputing a claim about its number.
Reports are hidden, never deleted:

```bash
# list what is currently hidden
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://www.canadial.com/api/admin/moderate

# hide a report (find its id in the JSON above, or in the database)
curl -X POST https://www.canadial.com/api/admin/moderate \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"id":"<report uuid>","hidden":true,"reason":"abusive comment"}'

# undo — the same call with hidden:false
```

`ADMIN_TOKEN` is a Vercel production environment variable. The endpoint fails
closed: unset token means 503, never open access.

The endpoint revalidates the number page, its area page and the homepage, so a
hidden report disappears immediately rather than at the next ISR window (a day
for number pages).

Why hide instead of delete:

- A moderation call can be wrong, and an UPDATE is trivially reversible.
- A disputed report is evidence. If the number's owner escalates, what was
  posted and when still has to be answerable.
- No code path needs DELETE, so `service_role` never gets it — only `postgres`
  can delete. A bug can hide rows; it cannot destroy them.

**Any new query against `spam_reports` must filter `hidden = false`.** Nine
TypeScript read paths and three RPCs (`get_site_stats`, `get_area_code_counts`,
`get_area_summary`) do. Miss one and a hidden comment vanishes from the page
while still inflating the counts printed beside it.

## Daily cycle

`.github/workflows/daily-import.yml` runs at 08:00 UTC: FTC import, ReverseCanada
import, then `refresh_area_summaries()`. The refresh must stay last — it
summarises what the importers just wrote — and the step fails loudly if it
returns zero, because a silent failure would leave every number page serving
stale area context indefinitely.

This workflow is also the free tier's keep-alive (see invariant 6).

## Watch

`.github/workflows/health.yml` asserts these invariants every day and
fails when one breaks, which emails the repo owner. It exists because Supabase's
usage alerts are dashboard-only — there is no endpoint for them anywhere in the
Management API. Run it by hand any time with `gh workflow run health.yml`, and
after any change to a route that reads the database.

It also records a daily snapshot (`record_usage_snapshot()`) of storage and rows
scanned. The rows/day threshold is provisional; retune it once a week of
snapshots exists (`select * from usage_snapshots order by captured_at desc`).

Supabase dashboard → Organization → Usage remains the source of truth for
billed egress in bytes; nothing here can read that number.

Storage grows daily via the FTC import. Around ~350 MB, prune old bulk
`source = 'ftc_dnc'` rows. Translations are hardcoded in `src/lib/i18n.ts`, not
in the database — dropping locales frees zero bytes.
