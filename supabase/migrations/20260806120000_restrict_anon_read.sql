-- Revoke public (anon-key) access to spam_reports and organizations.
--
-- Since 20260615011914_public_read_access.sql these tables carried a
-- `using (true)` SELECT policy for anon/authenticated, and spam_reports
-- additionally carried a public INSERT policy. Neither is used: every read
-- and write in this codebase goes through supabaseAdmin (the service_role
-- key, which bypasses RLS) — src/lib/lookup.ts, src/lib/spam.ts, both
-- server actions in src/app/**/actions.ts, and the Python importers in
-- scripts/. The anon client in src/lib/supabase.ts is exported but never
-- imported anywhere.
--
-- Left open, these meant anyone holding the public anon key could:
--   * page both tables directly through PostgREST with no rate limiting,
--     bypassing every app-level cache/ISR/RPC fix (this is egress, which
--     is what got the project restricted), and
--   * insert arbitrary rows into spam_reports, growing the table at will.
--
-- Idempotent — safe to re-run.

drop policy if exists "Public read access"    on public.spam_reports;
drop policy if exists "Public read access"    on public.organizations;
drop policy if exists "Public insert reports" on public.spam_reports;

revoke select on table public.spam_reports  from anon, authenticated;
revoke insert on table public.spam_reports  from anon, authenticated;
revoke select on table public.organizations from anon, authenticated;
