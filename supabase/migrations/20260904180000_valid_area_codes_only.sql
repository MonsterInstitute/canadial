-- Keep invalid area codes out of the area-code counts.
--
-- A real NANP area code never starts with 0 or 1, but the imported datasets
-- carry junk numbers (0000000000, 1111111111, 1720000000, ...). 158 rows have
-- such a number, spread over 67 impossible area codes — and because
-- get_area_code_counts() only filtered on length, every one of those codes was
-- being emitted into sitemap.xml as an indexable /area/<code> page. All of them
-- returned HTTP 200 and rendered like a real page.
--
-- Thin, auto-generated pages for data that cannot exist are exactly what
-- crawlers penalise, and this site can't afford to spend its crawl budget on
-- them. isValidAreaCode() in src/lib/phone.ts applies the same rule to the
-- /area/[code] and /lookup/[number] routes, which now 404.
--
-- get_site_stats() already filtered these out app-side (isPlausibleAreaCode in
-- src/lib/spam.ts), so the homepage was unaffected — only the sitemap and the
-- language landing pages, which read this function, were.
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
      and left(phone_number, 1) between '2' and '9'
    group by left(phone_number, 3)
  ) t;
$$;

grant execute on function public.get_area_code_counts() to anon, authenticated, service_role;
