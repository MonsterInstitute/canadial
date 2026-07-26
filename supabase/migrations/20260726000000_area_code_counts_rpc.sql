-- Fast area-code counts for the language landing pages via a single server-side
-- aggregation, instead of paging the whole spam_reports table into the app.
--
-- src/lib/spam.ts getAreaCodeCounts() previously called getAllPhoneNumbers(),
-- which pages through every row in spam_reports (~300k rows) and was a large
-- source of Supabase egress. This function does the same distinct-count
-- aggregation in one round trip inside Postgres.
--
-- Returns: { <3-digit area code>: <distinct-number count> }
--
-- Idempotent — safe to re-run.

create or replace function public.get_area_code_counts()
returns json
language sql
stable
as $$
  select coalesce(json_object_agg(area_code, cnt), '{}'::json)
  from (
    select left(phone_number, 3) as area_code,
           count(distinct phone_number) as cnt
    from public.spam_reports
    where length(phone_number) = 10
    group by left(phone_number, 3)
  ) t;
$$;

grant execute on function public.get_area_code_counts() to anon, authenticated, service_role;
