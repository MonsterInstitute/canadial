-- Materialize the per-area-code summaries.
--
-- get_area_summary() aggregates an entire area code on every call, and every
-- /lookup/[number] render calls it. That was affordable while the sitemap
-- listed only area pages. It stopped being affordable the moment 11.3k number
-- pages went into the sitemap and crawlers arrived: 45,201 calls in one burst,
-- 44.6 minutes of database time, and toll-free codes — which dominate the
-- indexable set (833 alone has 639 listed pages) — carry 5,000-11,000 rows
-- each. A page render was reading up to 11k rows to print four numbers.
--
-- The summary is identical for every number in a code, so computing it per page
-- was always wasted work: 667 distinct answers recomputed tens of thousands of
-- times. Materialized, a render reads one row by primary key.
--
--   before   up to ~11,000 rows per render, growing with the area code
--   after    1 row, constant
--
-- That is what makes the sitemap safe to grow past 11.3k pages: per-render cost
-- no longer depends on how much data an area code holds or how many pages point
-- at it.
--
-- Staleness: refreshed daily by the import workflow, and immediately for a
-- single code when a report is hidden (moderation must not leave a hidden
-- comment counted). Number pages are ISR-cached for a day anyway, and the
-- number's own verdict still comes from a live lookupPhone() — only the
-- surrounding area context can be up to a day old.
--
-- Reversible: drop the table and rename get_area_summary_live back.

create table if not exists public.area_summaries (
  code          text primary key,
  number_count  int  not null,
  report_total  int  not null,
  top_type      text,
  type_counts   json not null,
  -- The busiest TOP_NUMBERS_CAP numbers. Area pages ask for 100, number pages
  -- for 6; get_area_summary() slices. A request for more than the cap falls
  -- through to the live path rather than silently returning a short list.
  top_numbers   json not null,
  refreshed_at  timestamptz not null default now()
);

revoke all on table public.area_summaries from anon, authenticated;
grant select on table public.area_summaries to service_role;
alter table public.area_summaries enable row level security;

-- The existing implementation, unchanged, kept as the fallback for codes that
-- aren't in the table yet (a brand-new area code between refreshes) and for
-- limits above the stored cap.
create or replace function public.get_area_summary_live(p_code text, p_limit int default 6)
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

-- Recompute the table. Pass a code to refresh just that one (moderation), or
-- null to rebuild every code in a single pass over the table (daily).
-- Ordering and tiebreaks mirror get_area_summary_live() exactly, so the
-- materialized answer is byte-identical to the live one.
create or replace function public.refresh_area_summaries(p_code text default null)
returns int
language plpgsql
as $$
declare
  n_codes int;
begin
  with visible as (
    select id, phone_number, left(phone_number, 3) as code, type, comment, created_at
    from public.spam_reports
    where not hidden
      and length(phone_number) = 10
      and left(phone_number, 1) between '2' and '9'
      and (p_code is null or left(phone_number, 3) = p_code)
  ),
  counted as (
    select code, phone_number, count(*)::int as report_count, max(created_at) as last_seen
    from visible
    group by code, phone_number
  ),
  type_tally as (
    select code, phone_number, type, count(*) as n, max(created_at) as last_seen
    from visible
    where type is not null
    group by code, phone_number, type
  ),
  modal_type as (
    select distinct on (code, phone_number) code, phone_number, type
    from type_tally
    order by code, phone_number, n desc, last_seen desc, type
  ),
  newest_comment as (
    select distinct on (code, phone_number) code, phone_number, comment
    from visible
    where comment is not null
    order by code, phone_number, created_at desc, id desc
  ),
  per_number as (
    select c.code, c.phone_number, c.report_count, c.last_seen,
           m.type as most_common_type
    from counted c
    left join modal_type m on m.code = c.code and m.phone_number = c.phone_number
  ),
  ranked as (
    select p.*,
           row_number() over (
             partition by p.code
             order by p.report_count desc, p.last_seen desc, p.phone_number
           ) as rn
    from per_number p
  ),
  totals as (
    select code, count(*)::int as number_count, sum(report_count)::int as report_total
    from per_number
    group by code
  ),
  types as (
    select code, coalesce(most_common_type, 'Other') as type, count(*)::int as n
    from per_number
    group by code, coalesce(most_common_type, 'Other')
  ),
  top_type as (
    select distinct on (code) code, type
    from types
    order by code, n desc, type
  ),
  type_counts as (
    select code, json_object_agg(type, n) as tc
    from types
    group by code
  ),
  tops as (
    select r.code,
           json_agg(
             json_build_object(
               'phone_number', r.phone_number,
               'report_count', r.report_count,
               'most_common_type', r.most_common_type,
               'latest_comment', nc.comment
             )
             order by r.rn
           ) as top_numbers
    from ranked r
    left join newest_comment nc on nc.code = r.code and nc.phone_number = r.phone_number
    where r.rn <= 100
    group by r.code
  )
  insert into public.area_summaries
    (code, number_count, report_total, top_type, type_counts, top_numbers, refreshed_at)
  select t.code, t.number_count, t.report_total, tt.type, tc.tc,
         coalesce(tp.top_numbers, '[]'::json), now()
  from totals t
  left join top_type    tt on tt.code = t.code
  left join type_counts tc on tc.code = t.code
  left join tops        tp on tp.code = t.code
  on conflict (code) do update set
    number_count = excluded.number_count,
    report_total = excluded.report_total,
    top_type     = excluded.top_type,
    type_counts  = excluded.type_counts,
    top_numbers  = excluded.top_numbers,
    refreshed_at = excluded.refreshed_at;

  get diagnostics n_codes = row_count;

  -- Drop codes that no longer have any visible rows, so the table can't serve
  -- a summary for data that has been hidden or deleted.
  if p_code is null then
    delete from public.area_summaries a
    where not exists (
      select 1 from public.spam_reports s
      where not s.hidden
        and length(s.phone_number) = 10
        and left(s.phone_number, 3) = a.code
    );
  else
    delete from public.area_summaries a
    where a.code = p_code
      and not exists (
        select 1 from public.spam_reports s
        where not s.hidden
          and length(s.phone_number) = 10
          and left(s.phone_number, 3) = p_code
      );
  end if;

  return n_codes;
end;
$$;

-- Read path: one primary-key lookup, falling back to the live aggregation when
-- the code isn't materialized yet or more numbers are asked for than are stored.
create or replace function public.get_area_summary(p_code text, p_limit int default 6)
returns json
language sql
stable
as $$
  select coalesce(
    (
      select json_build_object(
        'number_count', a.number_count,
        'report_total', a.report_total,
        'top_type',     a.top_type,
        'type_counts',  a.type_counts,
        'top_numbers',  (
          select coalesce(json_agg(e order by ord), '[]'::json)
          from (
            select e, ord
            from json_array_elements(a.top_numbers) with ordinality as x(e, ord)
            limit greatest(p_limit, 1)
          ) sliced
        )
      )
      from public.area_summaries a
      where a.code = p_code
        and greatest(p_limit, 1) <= 100
    ),
    public.get_area_summary_live(p_code, p_limit)
  );
$$;

grant execute on function public.get_area_summary(text, int)      to service_role;
grant execute on function public.get_area_summary_live(text, int)  to service_role;
grant execute on function public.refresh_area_summaries(text)      to service_role;
