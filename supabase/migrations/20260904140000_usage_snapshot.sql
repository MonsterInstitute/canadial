-- Daily usage snapshot, so egress/storage trends are visible from CI instead of
-- only from the Supabase dashboard.
--
-- The dashboard's email alerts are the only built-in early warning, and they
-- can't be configured through the Management API (no such endpoint exists in
-- the 115-endpoint spec). This gives the same early warning from a source we
-- can automate: the daily workflow calls record_usage_snapshot() with the
-- service-role key it already has, and fails — which emails the repo owner —
-- when a threshold is crossed.
--
-- Tracks two numbers:
--   db_bytes     — storage against the 500 MB free-tier limit.
--   tup_returned — cumulative rows read by scans since the server started.
--                  This is the direct signature of the failure mode that took
--                  the site down: a code path that pages the whole table.
--                  Egress is billed in bytes, not rows, but a sudden jump here
--                  means something started scanning again, which is the thing
--                  worth catching early.
--
-- Idempotent — safe to re-run.

create table if not exists public.usage_snapshots (
  captured_at  timestamptz primary key default now(),
  db_bytes     bigint not null,
  tup_returned bigint not null
);

-- Internal telemetry: service_role only, never the public API roles. RLS is on
-- so there is no path to this table for anon/authenticated even if a grant is
-- ever added by mistake; service_role bypasses RLS but still needs the grant.
revoke all on table public.usage_snapshots from anon, authenticated;
grant select, insert, delete on table public.usage_snapshots to service_role;
alter table public.usage_snapshots enable row level security;

-- Records one snapshot and returns it alongside the previous one, so the caller
-- can compute a per-day delta without keeping state of its own.
create or replace function public.record_usage_snapshot()
returns json
language plpgsql
as $$
declare
  cur_db   bigint;
  cur_tup  bigint;
  prev     public.usage_snapshots%rowtype;
  elapsed  numeric;
begin
  select pg_database_size(current_database()) into cur_db;
  select s.tup_returned into cur_tup
    from pg_stat_database s
   where s.datname = current_database();

  select * into prev
    from public.usage_snapshots
   order by captured_at desc
   limit 1;

  insert into public.usage_snapshots (db_bytes, tup_returned)
  values (cur_db, cur_tup);

  -- Keep a rolling 90 days; this table exists for trend, not for history.
  delete from public.usage_snapshots
   where captured_at < now() - interval '90 days';

  elapsed := case
    when prev.captured_at is null then null
    else extract(epoch from (now() - prev.captured_at)) / 86400.0
  end;

  return json_build_object(
    'db_bytes', cur_db,
    'db_mb', round(cur_db / 1048576.0, 1),
    'tup_returned', cur_tup,
    -- null on the first run, and after a Postgres restart resets the counter
    -- (detected as a decrease), so the caller treats it as "no reading" rather
    -- than a bogus negative delta.
    'tup_per_day', case
      when prev.captured_at is null or elapsed is null or elapsed <= 0 then null
      when cur_tup < prev.tup_returned then null
      else round((cur_tup - prev.tup_returned) / elapsed)
    end,
    'days_since_previous', round(coalesce(elapsed, 0), 2)
  );
end;
$$;

grant execute on function public.record_usage_snapshot() to service_role;
