-- Let the API actually run refresh_area_summaries().
--
-- 20260906050000 granted service_role only SELECT on area_summaries, so both
-- callers of the refresh failed with 42501: the daily workflow step (403 from
-- PostgREST) and the moderation endpoint's inline per-code refresh, which logs
-- and continues and so failed silently. Left as it was, every number page would
-- have served a rollup frozen at its first build.
--
-- SECURITY DEFINER rather than granting service_role write access to the table:
-- the rollup should only ever change through this function, never through a
-- direct PostgREST write. service_role keeps SELECT and gains nothing else.
--
-- search_path is pinned because a SECURITY DEFINER function inherits the
-- caller's search_path otherwise, which is how these get hijacked.
--
-- p_code is a prefix, not just a full area code, because a full refresh takes
-- ~13s and PostgREST's authenticator role has statement_timeout=8s. Setting the
-- timeout on the function does not help — it is armed when the outer statement
-- begins, before the function's SET applies. So the caller shards:
--
--   '416'  one area code            (moderation, inline)
--   '8'    every code starting 8    (daily workflow, digits 2-9)
--   null   everything               (direct SQL only; times out over REST)

create or replace function public.refresh_area_summaries(p_code text default null)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
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
      and (p_code is null or left(phone_number, length(p_code)) = p_code)
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

  -- Drop codes in this shard that no longer have any visible rows, so the
  -- table can't serve a summary for data that has been hidden or deleted.
  delete from public.area_summaries a
  where (p_code is null or left(a.code, length(p_code)) = p_code)
    and not exists (
      select 1 from public.spam_reports s
      where not s.hidden
        and length(s.phone_number) = 10
        and left(s.phone_number, 3) = a.code
    );

  return n_codes;
end;
$$;

grant execute on function public.refresh_area_summaries(text) to service_role;
