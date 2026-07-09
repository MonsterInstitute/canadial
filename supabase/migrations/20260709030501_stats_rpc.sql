-- Fast homepage stats via a single server-side aggregation.
--
-- The homepage previously computed its stats by paging the entire spam_reports
-- table (~280k rows) into the app on every build and every ISR revalidation,
-- which timed out production builds. This function does the same aggregation in
-- one round trip inside Postgres and returns a small JSON payload.
--
-- Returns:
--   total_numbers : distinct 10-digit phone numbers in the database
--   total_reports : total report rows (10-digit numbers)
--   type_counts   : { <type>: <report count> } across spam reports
--   area_codes    : { <3-digit area code>: <distinct-number count> }
--
-- Province rollups, "most common type", and the busiest province are derived in
-- the app from area_codes/type_counts, so the area-code → province mapping stays
-- in one place (TypeScript). Idempotent — safe to re-run.

create or replace function public.get_site_stats()
returns json
language sql
stable
as $$
  select json_build_object(
    'total_numbers', (
      select count(distinct phone_number)
      from public.spam_reports
      where length(phone_number) = 10
    ),
    'total_reports', (
      select count(*)
      from public.spam_reports
      where length(phone_number) = 10
    ),
    'type_counts', (
      select coalesce(json_object_agg(type, cnt), '{}'::json)
      from (
        select type, count(*) as cnt
        from public.spam_reports
        where is_spam and type is not null and type <> ''
        group by type
      ) t
    ),
    'area_codes', (
      select coalesce(json_object_agg(code, cnt), '{}'::json)
      from (
        select left(phone_number, 3) as code, count(distinct phone_number) as cnt
        from public.spam_reports
        where length(phone_number) = 10
        group by left(phone_number, 3)
      ) a
    )
  );
$$;

grant execute on function public.get_site_stats() to anon, authenticated, service_role;
