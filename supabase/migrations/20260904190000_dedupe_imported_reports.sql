-- Remove duplicate imported reports, and stop new ones being created.
--
-- The daily importers deduplicate within a single run but never against what
-- is already stored, so every re-import of overlapping source data inserted the
-- same report again. That left 17,374 exact duplicates (same phone_number,
-- comment and source), inflating the report counts shown for 8,875 numbers —
-- a page could claim a number was "reported 6 times" when it was one FTC record
-- imported six times. Report counts are the core claim this site makes, so this
-- is a correctness fix first and a ~5% storage saving second.
--
-- Scope: rows with a non-null source, i.e. imported data only.
--
--   Community submissions (source is null) are deliberately excluded. Two
--   people reporting the same number with the same — or empty — comment are
--   two genuine reports, not a duplicate. Five such rows exist and are left
--   untouched, and the unique index below is partial for the same reason: it
--   must never reject a real submission through the report form.
--
-- Reversible: every deleted row is copied to spam_reports_dupes_backup first.
-- To roll back:
--   insert into public.spam_reports select * from public.spam_reports_dupes_backup;
--   drop index if exists spam_reports_imported_unique_idx;
--
-- Drop the backup table once the counts have been sane for a while.

-- 1. Keep a full copy of everything this migration deletes.
create table if not exists public.spam_reports_dupes_backup
  (like public.spam_reports including defaults);

revoke all on table public.spam_reports_dupes_backup from anon, authenticated;
alter table public.spam_reports_dupes_backup enable row level security;

insert into public.spam_reports_dupes_backup
select s.*
from public.spam_reports s
join (
  select id
  from (
    select id,
           row_number() over (
             partition by phone_number, comment, source
             order by created_at asc, id asc
           ) as rn
    from public.spam_reports
    where source is not null
  ) ranked
  where rn > 1
) d on d.id = s.id
-- Idempotent: re-running must not double up the backup.
where not exists (
  select 1 from public.spam_reports_dupes_backup b where b.id = s.id
);

-- 2. Delete the duplicates, keeping the oldest row of each group.
--    created_at is identical across a bulk import, so id is the tiebreak that
--    makes "oldest" deterministic.
delete from public.spam_reports s
using (
  select id
  from (
    select id,
           row_number() over (
             partition by phone_number, comment, source
             order by created_at asc, id asc
           ) as rn
    from public.spam_reports
    where source is not null
  ) ranked
  where rn > 1
) d
where s.id = d.id;

-- 3. Prevent recurrence.
--    NULLS NOT DISTINCT (Postgres 15+) so a null comment still collides —
--    without it the null-comment imports would keep duplicating.
--    Partial on source is not null so community submissions stay unconstrained.
create unique index if not exists spam_reports_imported_unique_idx
  on public.spam_reports (phone_number, comment, source)
  nulls not distinct
  where source is not null;
