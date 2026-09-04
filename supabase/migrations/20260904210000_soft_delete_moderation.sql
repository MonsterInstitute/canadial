-- Soft delete for moderation.
--
-- The report form takes free text, so this site will eventually host a comment
-- that has to come down: abuse, a phone number's owner disputing a claim, a
-- doxxed personal detail. Until now there was no way to remove one. service_role
-- has INSERT, SELECT and UPDATE on spam_reports but not DELETE — only the
-- postgres role can delete — so taking a comment down meant opening the SQL
-- editor by hand.
--
-- Hiding rather than deleting, because:
--   * a moderation call can be wrong, and an UPDATE is trivially reversible
--     where a DELETE is not;
--   * a disputed report is evidence — if the number's owner escalates, what was
--     posted and when still needs to be answerable;
--   * no code path needs DELETE, so service_role never gets it. A bug can hide
--     rows; it cannot destroy them.
--
-- Reversible:
--   update public.spam_reports set hidden = false where hidden;   -- unhide all
--   drop index if exists spam_reports_hidden_idx;
--   alter table public.spam_reports drop column if exists hidden;

alter table public.spam_reports
  add column if not exists hidden boolean not null default false;

-- Every read path filters `hidden = false`. Partial index on the hidden rows:
-- they are the rare case, and this keeps the moderation queue cheap to list
-- without adding a column to the indexes that serve normal reads.
create index if not exists spam_reports_hidden_idx
  on public.spam_reports (created_at desc)
  where hidden;

-- Defence in depth. anon/authenticated currently hold no grants on this table
-- (20260806120000), so these policies grant nothing today — a policy without a
-- privilege is inert. They exist so that if SELECT is ever granted back, hidden
-- rows stay invisible by default instead of silently becoming public.
drop policy if exists "Public read excludes hidden" on public.spam_reports;
create policy "Public read excludes hidden"
  on public.spam_reports
  for select
  to anon, authenticated
  using (hidden = false);
