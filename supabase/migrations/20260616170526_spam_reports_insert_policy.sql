-- Allow public report submissions on spam_reports.
--
-- The report form inserts via the server; in production the client effectively
-- acts as the anon role, and RLS had only a SELECT policy — so inserts were
-- blocked (error 42501 / "new row violates row-level security policy").
-- This adds the matching INSERT grant + policy so community reports can be saved.
-- Idempotent.

grant insert on table public.spam_reports to anon, authenticated;

drop policy if exists "Public insert reports" on public.spam_reports;
create policy "Public insert reports"
  on public.spam_reports
  for insert
  to anon, authenticated
  with check (true);
