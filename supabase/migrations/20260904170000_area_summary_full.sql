-- Make the area-code summary exact, and let it serve the area pages too.
--
-- Two problems with the sampled version this replaces:
--
-- 1. It was wrong. Commit 0e6915f bounded the read to "the 100 most recent
--    reports for the code" to cut egress, and accepted that counts would
--    reflect recent activity rather than the real total. Area code 416 has 336
--    rows, so /area/416 claimed "92 reported numbers" instead of the true
--    count. Every count, total, and type breakdown on both the area pages and
--    the number pages was understated the same way.
--
-- 2. The sample wasn't even well defined. Bulk FTC imports stamp thousands of
--    rows with an identical created_at, so "the 100 most recent" is arbitrary
--    among ties — which 100 rows came back depended on the query plan, and
--    changed when the area-code index was added.
--
-- Sampling was only ever a workaround for the missing index. With
-- spam_reports_area_code_created_idx in place, aggregating an entire area code
-- is cheaper than the old sampled scan was:
--
--   worst case (833, 11,508 rows)   32.3 ms, 6157 buffers
--   typical    (416,    336 rows)    1.16 ms,   55 buffers
--   old sampled version             110.7 ms, 14350 buffers  (full seq scan)
--
-- Distribution across all 732 codes: mean 459 rows, p95 1576, max 11,508 — so
-- the typical case dominates and the worst case is still well bounded.
--
-- p_limit caps only the returned number list, not the aggregates: the number
-- pages ask for a handful of related numbers, the area pages ask for a page's
-- worth. Counts are always exact regardless of p_limit.
--
-- Returns:
--   { number_count, report_total, top_type,
--     type_counts: { <type>: <numbers with that modal type> },
--     top_numbers: [ { phone_number, report_count, most_common_type,
--                      latest_comment } ] }
--
-- Idempotent — safe to re-run.

-- The single-argument version would otherwise stay behind and make
-- get_area_summary(p_code := ...) ambiguous.
drop function if exists public.get_area_summary(text);

create or replace function public.get_area_summary(p_code text, p_limit int default 6)
returns json
language sql
stable
as $$
  with rows_for_code as (
    -- Matches spam_reports_area_code_created_idx. No LIKE: left() is the
    -- stricter test, and mixing them pulls the planner toward the
    -- text_pattern_ops index, which then has to sort.
    select phone_number, type, comment, created_at
    from public.spam_reports
    where left(phone_number, 3) = p_code
      and length(phone_number) = 10
  ),
  -- Modal type per number. Done as group-then-distinct-on rather than a
  -- correlated subquery per number, which would be O(n^2) once a code has
  -- thousands of rows. Ties go to the type seen most recently.
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
  -- Aggregate first, then attach the modal type. Joining before the GROUP BY
  -- (and grouping by the comment text) made this 2.4s on the largest code;
  -- this ordering keeps it in the tens of milliseconds.
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
  -- Numbers grouped by their modal type; untyped numbers count as 'Other',
  -- matching how the pages bucket them.
  type_buckets as (
    select coalesce(most_common_type, 'Other') as type, count(*)::int as n
    from per_number
    group by 1
  )
  select json_build_object(
    'number_count', (select count(*) from per_number),
    'report_total', (select coalesce(sum(report_count), 0) from per_number),
    'top_type', (
      select type from type_buckets order by n desc, type limit 1
    ),
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
          -- Looked up per returned row, not for every number in the code:
          -- p_limit is 6 on number pages and ~100 on area pages, and each
          -- lookup is an index hit on spam_reports_phone_number_idx.
          (
            select s.comment
            from public.spam_reports s
            where s.phone_number = n.phone_number
              and s.comment is not null
            order by s.created_at desc, s.id desc
            limit 1
          ) as latest_comment
        from (
          select phone_number, report_count, most_common_type
          from per_number
          -- phone_number last so the order is stable: bulk imports write
          -- identical created_at values, and an unstable order would make the
          -- same page render differently on each ISR regeneration.
          order by report_count desc, last_seen desc, phone_number
          limit greatest(p_limit, 1)
        ) n
      ) t
    )
  );
$$;

grant execute on function public.get_area_summary(text, int) to service_role;
