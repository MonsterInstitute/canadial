-- Report the previous day's scan rate alongside today's.
--
-- The guardrails workflow alerts when rows-scanned-per-day crosses a threshold.
-- On its first real run it fired at 1.54 billion rows/day — a true reading, but
-- entirely this session's own maintenance: six full builds, the dedupe delete,
-- a table rewrite, VACUUM/ANALYZE, and several EXPLAIN ANALYZE over full scans.
-- Measured over a quiet six-minute window immediately afterwards, the steady
-- state was 7.2 million rows/day, 5% of the threshold.
--
-- So a single day's rate can't distinguish "someone shipped a full-table scan"
-- from "we ran a migration". A sustained rate can: regressions persist, and
-- maintenance doesn't. Returning the previous interval's rate too lets the
-- workflow require two consecutive breaches before it alerts, without needing
-- to hold any state of its own.
--
-- Idempotent — safe to re-run.

create or replace function public.record_usage_snapshot()
returns json
language plpgsql
as $$
declare
  cur_db    bigint;
  cur_tup   bigint;
  prev      public.usage_snapshots%rowtype;
  prev2     public.usage_snapshots%rowtype;
  elapsed   numeric;
  elapsed_p numeric;
begin
  select pg_database_size(current_database()) into cur_db;
  select s.tup_returned into cur_tup
    from pg_stat_database s
   where s.datname = current_database();

  -- The two most recent snapshots, newest first.
  select * into prev
    from public.usage_snapshots order by captured_at desc offset 0 limit 1;
  select * into prev2
    from public.usage_snapshots order by captured_at desc offset 1 limit 1;

  insert into public.usage_snapshots (db_bytes, tup_returned)
  values (cur_db, cur_tup);

  delete from public.usage_snapshots
   where captured_at < now() - interval '90 days';

  elapsed := case when prev.captured_at is null then null
                  else extract(epoch from (now() - prev.captured_at)) / 86400.0 end;
  elapsed_p := case when prev.captured_at is null or prev2.captured_at is null then null
                    else extract(epoch from (prev.captured_at - prev2.captured_at)) / 86400.0 end;

  return json_build_object(
    'db_bytes', cur_db,
    'db_mb', round(cur_db / 1048576.0, 1),
    'tup_returned', cur_tup,
    -- null means "no usable reading", and the caller skips the check rather
    -- than acting on a bogus number: the first run, a counter reset after a
    -- Postgres restart (seen as a decrease), or a gap too short to extrapolate
    -- from — dividing a few minutes' delta by a fraction of a day turns normal
    -- traffic into billions of rows/day.
    'tup_per_day', case
      when prev.captured_at is null or elapsed is null or elapsed < 0.25 then null
      when cur_tup < prev.tup_returned then null
      else round((cur_tup - prev.tup_returned) / elapsed)
    end,
    'prev_tup_per_day', case
      when elapsed_p is null or elapsed_p < 0.25 then null
      when prev.tup_returned < prev2.tup_returned then null
      else round((prev.tup_returned - prev2.tup_returned) / elapsed_p)
    end,
    'days_since_previous', round(coalesce(elapsed, 0), 2)
  );
end;
$$;

grant execute on function public.record_usage_snapshot() to service_role;
