-- Exclude hidden reports from the aggregation RPCs.
--
-- The TypeScript read paths filter `hidden = false` directly, but these three
-- functions do their own SELECTs and would otherwise keep counting a moderated
-- report in the totals, the type breakdown and the area-code lists — so a
-- hidden comment would vanish from the page while still inflating the numbers
-- printed next to it.
--
-- Idempotent — safe to re-run.

-- Site-wide stats (homepage). Deliberately the installed flat shape
-- ({total, scam, telemarketer, robocall, debt, area_counts}, where each type is
-- a distinct-number count) with `not hidden` added and nothing else changed.
-- normalizeStatsPayload() in src/lib/spam.ts reads both this and a canonical
-- shape, so switching would have worked — but it would also have quietly
-- redefined "Most reported type" from distinct numbers to report rows. That is
-- a product decision, not something to slip into a moderation migration.
create or replace function public.get_site_stats()
returns json
language sql
stable
as $$
  select json_build_object(
    'total', count(distinct phone_number),
    'scam', count(distinct phone_number) filter (where type = 'Scam'),
    'telemarketer', count(distinct phone_number) filter (where type = 'Telemarketer'),
    'robocall', count(distinct phone_number) filter (where type = 'Robocall'),
    'debt', count(distinct phone_number) filter (where type = 'Debt Collector'),
    'area_counts', (
      select json_object_agg(area_code, cnt)
      from (
        select left(phone_number, 3) as area_code,
               count(distinct phone_number) as cnt
        from public.spam_reports
        where not hidden
        group by left(phone_number, 3)
      ) ac
    )
  )
  from public.spam_reports
  where not hidden;
$$;

grant execute on function public.get_site_stats() to anon, authenticated, service_role;

-- Distinct-number counts per area code (sitemap, language landing pages).
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
      and not hidden
    group by left(phone_number, 3)
  ) t;
$$;

grant execute on function public.get_area_code_counts() to anon, authenticated, service_role;

-- Area-code summary (number pages and area pages).
create or replace function public.get_area_summary(p_code text, p_limit int default 6)
returns json
language sql
stable
as $$
  with rows_for_code as (
    select phone_number, type, comment, created_at
    from public.spam_reports
    where left(phone_number, 3) = p_code
      and length(phone_number) = 10
      and not hidden
  ),
  type_tally as (
    select phone_number, type, count(*) as n, max(created_at) as last_seen
    from rows_for_code
    where type is not null
    group by phone_number, type
  ),
  modal_type as (
    select distinct on (phone_number) phone_number, type
    from type_tally
    order by phone_number, n desc, last_seen desc, type
  ),
  counted as (
    select phone_number, count(*)::int as report_count, max(created_at) as last_seen
    from rows_for_code
    group by phone_number
  ),
  per_number as (
    select c.phone_number, c.report_count, c.last_seen, m.type as most_common_type
    from counted c
    left join modal_type m on m.phone_number = c.phone_number
  ),
  type_buckets as (
    select coalesce(most_common_type, 'Other') as type, count(*)::int as n
    from per_number
    group by 1
  )
  select json_build_object(
    'number_count', (select count(*) from per_number),
    'report_total', (select coalesce(sum(report_count), 0) from per_number),
    'top_type', (select type from type_buckets order by n desc, type limit 1),
    'type_counts', (
      select coalesce(json_object_agg(type, n), '{}'::json) from type_buckets
    ),
    'top_numbers', (
      select coalesce(json_agg(t), '[]'::json)
      from (
        select
          n.phone_number,
          n.report_count,
          n.most_common_type,
          (
            select s.comment
            from public.spam_reports s
            where s.phone_number = n.phone_number
              and s.comment is not null
              and not s.hidden
            order by s.created_at desc, s.id desc
            limit 1
          ) as latest_comment
        from (
          select phone_number, report_count, most_common_type
          from per_number
          order by report_count desc, last_seen desc, phone_number
          limit greatest(p_limit, 1)
        ) n
      ) t
    )
  );
$$;

grant execute on function public.get_area_summary(text, int) to service_role;
