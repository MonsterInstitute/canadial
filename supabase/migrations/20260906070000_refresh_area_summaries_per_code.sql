-- Rebuild refresh_area_summaries() so it can actually run through the API.
--
-- The version in 20260906050000/060000 could not. Two independent problems,
-- both found by dry-running the workflow step rather than trusting it:
--
-- 1. service_role had only SELECT on area_summaries, so every call failed with
--    42501 — a 403 in the workflow, and a silent log line in the moderation
--    endpoint, which catches and continues. SECURITY DEFINER fixes that without
--    granting the API write access to the rollup table.
--
-- 2. A full refresh took ~19s against PostgREST's 8s statement_timeout, and
--    sharding it made things worse, not better: p_code='83' took 27s, and
--    p_code='41' — 348 numbers — took 8.8s. Inside plpgsql the parameter is
--    opaque to the planner, so `left(phone_number, length(p_code)) = p_code`
--    could not use the (left(phone_number,3), created_at) index and produced a
--    generic plan with nonsense row estimates. Setting statement_timeout on the
--    function doesn't help either: it is armed when the outer statement begins.
--
-- The fix is to make each unit of work a plain indexed equality on one area
-- code, which the planner handles well, and to loop over codes in plpgsql:
--
--   833 (11k rows)  5441 ms -> 180 ms
--   866             1420 ms ->  70 ms
--   416               60 ms ->  14 ms
--
-- The 30x came from not building the comment lookup over every row in the code.
-- Only the top 100 numbers are ever returned, so their comments are fetched
-- individually — the same correlated lookup get_area_summary_live() uses, which
-- also keeps the two implementations semantically identical.
--
-- Callers pass the codes they want. The daily workflow chunks the full list so
-- no single request approaches the timeout; the moderation endpoint passes one.
-- Passing null refreshes everything and is for direct SQL only — it is ~20s and
-- will time out over REST.

drop function if exists public.refresh_area_summaries(text);
drop function if exists public.rs_one(text);

create or replace function public.refresh_area_summaries(p_codes text[] default null)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  -- v_ prefix throughout: plain `n` and `c` collided with the `count(*) as n`
  -- column and the CTE aliases, and plpgsql resolved it as 42702 (ambiguous
  -- reference) at runtime, not at create time.
  v_codes text[];
  v_code  text;
  v_n     int := 0;
begin
  if p_codes is null then
    select array_agg(distinct left(phone_number, 3))
      into v_codes
      from public.spam_reports
     where not hidden
       and length(phone_number) = 10
       and left(phone_number, 1) between '2' and '9';
  else
    v_codes := p_codes;
  end if;

  foreach v_code in array coalesce(v_codes, '{}'::text[]) loop
    -- Skip anything that isn't a real area code, so a bad argument can't insert
    -- a junk row that would then be served to a page.
    continue when v_code !~ '^[2-9]\d\d$';

    with visible as (
      -- Plain equality on left(phone_number,3): matches
      -- spam_reports_area_code_created_idx, and the planner can estimate it.
      select phone_number, type, created_at
      from public.spam_reports
      where left(phone_number, 3) = v_code
        and length(phone_number) = 10
        and not hidden
    ),
    counted as (
      select phone_number, count(*)::int as report_count, max(created_at) as last_seen
      from visible group by phone_number
    ),
    type_tally as (
      select phone_number, type, count(*) as n, max(created_at) as last_seen
      from visible where type is not null group by phone_number, type
    ),
    modal_type as (
      select distinct on (phone_number) phone_number, type
      from type_tally order by phone_number, n desc, last_seen desc, type
    ),
    per_number as (
      select cn.phone_number, cn.report_count, cn.last_seen, m.type as most_common_type
      from counted cn left join modal_type m using (phone_number)
    ),
    type_buckets as (
      select coalesce(most_common_type, 'Other') as type, count(*)::int as n
      from per_number group by 1
    ),
    top_hundred as (
      select * from per_number
      order by report_count desc, last_seen desc, phone_number
      limit 100
    )
    insert into public.area_summaries
      (code, number_count, report_total, top_type, type_counts, top_numbers, refreshed_at)
    select
      v_code,
      (select count(*) from per_number),
      (select coalesce(sum(report_count), 0) from per_number),
      (select type from type_buckets order by n desc, type limit 1),
      (select coalesce(json_object_agg(type, n), '{}'::json) from type_buckets),
      coalesce((
        select json_agg(
                 json_build_object(
                   'phone_number', x.phone_number,
                   'report_count', x.report_count,
                   'most_common_type', x.most_common_type,
                   'latest_comment', (
                     select s.comment from public.spam_reports s
                     where s.phone_number = x.phone_number
                       and s.comment is not null
                       and not s.hidden
                     order by s.created_at desc, s.id desc
                     limit 1
                   )
                 )
                 order by x.report_count desc, x.last_seen desc, x.phone_number
               )
        from top_hundred x
      ), '[]'::json),
      now()
    on conflict (code) do update set
      number_count = excluded.number_count,
      report_total = excluded.report_total,
      top_type     = excluded.top_type,
      type_counts  = excluded.type_counts,
      top_numbers  = excluded.top_numbers,
      refreshed_at = excluded.refreshed_at;

    -- A code whose last visible row just disappeared must not keep serving a
    -- summary. Only ever removes codes this call was asked about.
    delete from public.area_summaries a
    where a.code = v_code
      and not exists (
        select 1 from public.spam_reports s
        where not s.hidden
          and length(s.phone_number) = 10
          and left(s.phone_number, 3) = v_code
      );

    v_n := v_n + 1;
  end loop;

  return v_n;
end;
$$;

grant execute on function public.refresh_area_summaries(text[]) to service_role;
