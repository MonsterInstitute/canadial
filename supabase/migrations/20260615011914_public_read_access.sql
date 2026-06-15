-- Public read access for the phone-lookup tables.
--
-- Fixes Postgres error 42501 ("permission denied for table ...") for the anon
-- role: the homepage and lookup pages read spam_reports and organizations with
-- the anon key, but those tables were created without the default Supabase
-- grants. This grants read access and gates it behind a permissive RLS policy.
-- Idempotent — safe to run more than once.

-- 1. Grant base SELECT privilege to the API roles.
grant select on table public.spam_reports  to anon, authenticated;
grant select on table public.organizations to anon, authenticated;

-- 2. Enable Row Level Security so access is governed by policies, not raw grants.
alter table public.spam_reports  enable row level security;
alter table public.organizations enable row level security;

-- 3. Allow anyone to read both tables (this data is meant to be public).
drop policy if exists "Public read access" on public.spam_reports;
create policy "Public read access"
  on public.spam_reports
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Public read access" on public.organizations;
create policy "Public read access"
  on public.organizations
  for select
  to anon, authenticated
  using (true);
