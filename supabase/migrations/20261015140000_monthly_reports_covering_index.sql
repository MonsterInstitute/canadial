-- Covering index for the monthly-report refresh.
--
-- EXPLAIN ANALYZE of compute_monthly_report('2026-09') (2026-10-15): 14.4s,
-- nearly all of it heap fetches behind spam_reports_visible_created_idx —
-- 115k rows for the month in 4.4s and 319k earlier rows for "new this month"
-- in 9.4s. Every column those scans need is in this index, so they become
-- index-only scans and never touch the heap. ~20 MB.
--
-- Reversible: drop this index and recreate spam_reports_visible_created_idx
-- from 20261015120000.
create index concurrently if not exists spam_reports_visible_created_cover_idx
  on public.spam_reports (created_at) include (phone_number, type)
  where not hidden;

drop index concurrently if exists public.spam_reports_visible_created_idx;
