-- Replace the composite unique index with a single-column dedupe key.
--
-- 20260904190000 added a partial unique index on
-- (phone_number, comment, source) where source is not null. It correctly blocks
-- duplicate imports, but has two problems:
--
--   1. PostgREST cannot use it for ON CONFLICT. Postgres only infers a partial
--      unique index when the statement repeats the index predicate, and
--      PostgREST emits none, so the importers get:
--        42P10: there is no unique or exclusion constraint matching the
--               ON CONFLICT specification
--      That makes ignore-duplicates on insert impossible, and leaves the
--      importers relying on catching 409s.
--
--   2. It indexes the full comment text and cost 67 MB — larger than every
--      other index on the table combined, on a 500 MB storage budget.
--
-- A generated md5 fixes both: single column, so `on_conflict=dedupe_key` infers
-- cleanly, and 32 bytes per row instead of the whole comment.
--
-- dedupe_key is null for community submissions (source is null). With the
-- default NULLS DISTINCT, null keys never collide, so two people reporting the
-- same number with the same or empty comment both go through — the report form
-- must never reject a genuine submission. Imported rows always have a source,
-- so they always get a key.
--
-- Adding a stored generated column rewrites the table, which also compacts the
-- heap bloat left by the dedupe delete.
--
-- Reversible:
--   drop index if exists spam_reports_dedupe_key_idx;
--   alter table public.spam_reports drop column if exists dedupe_key;
--   -- then recreate the index from 20260904190000 if wanted

alter table public.spam_reports
  add column if not exists dedupe_key text
  generated always as (
    case
      when source is null then null
      else md5(phone_number || '|' || coalesce(comment, '') || '|' || source)
    end
  ) stored;

create unique index if not exists spam_reports_dedupe_key_idx
  on public.spam_reports (dedupe_key);

drop index if exists public.spam_reports_imported_unique_idx;
