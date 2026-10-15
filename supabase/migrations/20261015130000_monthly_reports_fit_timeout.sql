-- Make the daily monthly-report refresh fit PostgREST's 8s statement timeout.
--
-- Measured through the Management API on 2026-10-15: the default call
-- (current + previous month) took 14.7s. Its parts: the all-time
-- count(distinct phone_number) ~1.8s, and 2.6-4.8s per month. The daily job
-- calls through PostgREST, so it would have failed every day.
--
-- Two changes:
--   * The all-time total comes from area_summaries, which the workflow
--     refreshes in the step just before this one: the sum of number_count
--     over ~700 rows is the same distinct, visible, valid-area-code count,
--     without scanning spam_reports.
--   * scripts/refresh_monthly_reports.py calls once per month, so one call is
--     one month of work (~3-5s) instead of two.
--
-- Reversible: re-run the previous migration's definition of this function.

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
  select coalesce(sum(number_count), 0)::int into v_total from public.area_summaries;

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
