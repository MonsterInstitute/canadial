-- Index the area-code lookups. Without these, every number page scanned the
-- whole table.
--
-- spam_reports already had a btree on phone_number, but the database collation
-- is not "C", so a plain text btree cannot serve `phone_number LIKE '416%'`.
-- Both area-code read paths were therefore parallel sequential scans over all
-- ~336k rows:
--
--   explain (analyze, buffers) ... where phone_number like '416%'
--     Parallel Seq Scan on spam_reports
--     Rows Removed by Filter: 167996   (x2 workers)
--     Buffers: shared hit=14350
--     Execution Time: 110.687 ms
--
-- That ran on every /lookup/[number] render. get_area_summary() had already cut
-- the *egress* of this path to ~1 KB, but the database was still reading the
-- entire table each time — the same unbounded-read pattern AGENTS.md forbids,
-- just internal rather than over the network.
--
-- Two indexes, because the two callers phrase the same question differently:
--
--   area_code_created — (left(phone_number,3), created_at desc) serves
--     get_area_summary(), which filters on left() and orders by created_at.
--     Leading the index with the area code and carrying created_at means the
--     LIMIT 100 is satisfied straight from the index with no sort:
--       Index Scan ... Buffers: shared hit=39, Execution Time: 1.187 ms
--
--   phone_prefix — text_pattern_ops supports the LIKE 'code%' that PostgREST
--     generates for getNumbersForAreaCode() (the /area/[code] pages):
--       Index Scan ... Buffers: shared hit=297, Execution Time: 3.418 ms
--
-- ~15 MB of index for a 93x reduction in work on the site's busiest route.
-- Idempotent — safe to re-run.

create index if not exists spam_reports_area_code_created_idx
  on public.spam_reports (left(phone_number, 3), created_at desc);

create index if not exists spam_reports_phone_prefix_idx
  on public.spam_reports (phone_number text_pattern_ops);

-- The restore reset planner statistics (pg_stat_user_tables reported
-- n_live_tup = 0 for a 150 MB table), so plans were being chosen blind.
analyze public.spam_reports;
