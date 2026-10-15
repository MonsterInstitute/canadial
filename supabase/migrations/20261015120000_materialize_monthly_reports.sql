-- Materialize the monthly spam-call reports.
--
-- getMonthlyReport() paged the ENTIRE spam_reports table into the app on every
-- render (~673k rows, ~64 MB of JSON) to compute one month. 11 locales x every
-- month, revalidated weekly, plus every build prerendering the English months:
-- that alone is over the 5 GB/month egress budget, and it is what failed the
-- Oct 11 production build (each month timed out at 60s, three times). It broke
-- invariant 2 in AGENTS.md: aggregate in Postgres, never in the app.
--
-- Same shape as area_summaries: one row per month, refreshed by the daily
-- import (current and previous month) and by moderation (the hidden report's
-- month). A render reads one row by primary key.
--
--   before   every row in the table, per render, growing with the data
--   after    1 row, constant
--
-- Reversible: drop the functions and the table; the old app code needs none of
-- them.

-- Month range scans. Without this, "rows created in month X" is a full scan,
-- and so was the min/max(created_at) pair getReportableMonths() ran per build.
create index if not exists spam_reports_visible_created_idx
  on public.spam_reports (created_at)
  where not hidden;

create table if not exists public.monthly_reports (
  ym           text primary key,          -- 'YYYY-MM'
  payload      json not null,
  refreshed_at timestamptz not null default now()
);

revoke all on table public.monthly_reports from anon, authenticated;
grant select on table public.monthly_reports to service_role;
alter table public.monthly_reports enable row level security;

-- The raw aggregates for one month. Province rollups and region names are
-- derived in TypeScript (src/lib/reports.ts), where the area-code -> province
-- mapping lives. Returns null for a month with no visible reports.
--
-- p_total_numbers is the all-time distinct-number count, computed once per
-- refresh by the caller rather than once per month.
create or replace function public.compute_monthly_report(
  p_ym text,
  p_total_numbers int
)
returns json
language plpgsql
stable
as $$
declare
  -- Month boundaries in UTC, matching the old app code (which bucketed on the
  -- UTC ISO string PostgREST returns), whatever the session timezone is.
  v_start timestamptz := ((p_ym || '-01')::timestamp) at time zone 'utc';
  v_end   timestamptz := ((p_ym || '-01')::timestamp + interval '1 month') at time zone 'utc';
  v_prev  timestamptz := ((p_ym || '-01')::timestamp - interval '1 month') at time zone 'utc';
  v_out   json;
begin
  with month_rows as (
    select phone_number, type
    from public.spam_reports
    where not hidden
      and created_at >= v_start and created_at < v_end
      and phone_number ~ '^[2-9][0-9]{9}$'
  ),
  per_number as (
    select phone_number,
           count(*)::int as n,
           mode() within group (order by type) as top_type
    from month_rows
    group by phone_number
  ),
  new_numbers as (
    select count(*)::int as n
    from per_number p
    where not exists (
      select 1 from public.spam_reports s
      where s.phone_number = p.phone_number
        and not s.hidden
        and s.created_at < v_start
    )
  ),
  prev_numbers as (
    select count(distinct phone_number)::int as n
    from public.spam_reports
    where not hidden
      and created_at >= v_prev and created_at < v_start
      and phone_number ~ '^[2-9][0-9]{9}$'
  ),
  types as (
    select type, count(*)::int as n
    from month_rows
    where type is not null
    group by type
  ),
  codes as (
    select left(phone_number, 3) as code, count(*)::int as n
    from per_number
    group by 1
  ),
  top_numbers as (
    select phone_number, n, top_type
    from per_number
    order by n desc, phone_number asc
    limit 10
  )
  select case when (select count(*) from per_number) = 0 then null else
    json_build_object(
      'ym', p_ym,
      'total_numbers_all_time', p_total_numbers,
      'month_numbers', (select count(*) from per_number),
      'month_reports', (select count(*) from month_rows),
      'new_this_month', (select n from new_numbers),
      'prev_month_numbers', (select n from prev_numbers),
      'type_counts', coalesce((select json_object_agg(type, n) from types), '{}'::json),
      'area_code_counts', coalesce((select json_object_agg(code, n) from codes), '{}'::json),
      'top_numbers', coalesce((
        select json_agg(json_build_object(
          'phone_number', phone_number, 'count', n, 'type', top_type))
        from top_numbers), '[]'::json)
    ) end
  into v_out;
  return v_out;
end;
$$;

-- Recompute the given months ('YYYY-MM'), or the current and previous month
-- when called with no argument. Months that no longer have visible reports are
-- removed so they 404 instead of serving stale numbers. Returns the number of
-- months written.
--
-- security definer for the same reason as refresh_area_summaries(): it writes a
-- table service_role can only read.
create or replace function public.refresh_monthly_reports(p_months text[] default null)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_months text[] := coalesce(p_months, array[
    to_char(now() at time zone 'utc', 'YYYY-MM'),
    to_char((now() at time zone 'utc') - interval '1 month', 'YYYY-MM')
  ]);
  v_total int;
  v_ym text;
  v_payload json;
  v_written int := 0;
begin
  select count(distinct phone_number)::int into v_total
  from public.spam_reports
  where not hidden and phone_number ~ '^[2-9][0-9]{9}$';

  foreach v_ym in array v_months loop
    if v_ym !~ '^\d{4}-(0[1-9]|1[0-2])$' then
      raise exception 'bad month %', v_ym;
    end if;
    v_payload := public.compute_monthly_report(v_ym, v_total);
    if v_payload is null then
      delete from public.monthly_reports where ym = v_ym;
    else
      insert into public.monthly_reports (ym, payload, refreshed_at)
      values (v_ym, v_payload, now())
      on conflict (ym) do update
        set payload = excluded.payload, refreshed_at = excluded.refreshed_at;
      v_written := v_written + 1;
    end if;
  end loop;
  return v_written;
end;
$$;

-- Read paths. Both are primary-key reads of a table with one row per month.
create or replace function public.get_monthly_report(p_ym text)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select payload from public.monthly_reports where ym = p_ym;
$$;

create or replace function public.get_reportable_months()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(json_agg(ym order by ym desc), '[]'::json) from public.monthly_reports;
$$;

revoke all on function public.compute_monthly_report(text, int) from public, anon, authenticated;
revoke all on function public.refresh_monthly_reports(text[])  from public, anon, authenticated;
revoke all on function public.get_monthly_report(text)         from public, anon, authenticated;
revoke all on function public.get_reportable_months()          from public, anon, authenticated;
grant execute on function public.refresh_monthly_reports(text[]) to service_role;
grant execute on function public.get_monthly_report(text)         to service_role;
grant execute on function public.get_reportable_months()          to service_role;

-- One-time backfill of every month that has data. Run this as postgres (SQL
-- editor or the Management API), not through PostgREST: it covers every month
-- and can exceed the 8s authenticator statement_timeout.
--
--   select public.refresh_monthly_reports(array(
--     select distinct to_char(created_at at time zone 'utc', 'YYYY-MM')
--     from public.spam_reports where not hidden));
