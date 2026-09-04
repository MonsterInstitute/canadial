-- Area-code summary for the number pages, aggregated inside Postgres.
--
-- Every /lookup/[number] render needs four things about the number's area
-- code: how many distinct numbers are reported, the total report count, the
-- most common caller type, and a handful of "related numbers" to link to.
--
-- src/lib/spam.ts getNumbersForAreaCode() answered that by pulling the 100
-- most recent reports for the code — including full comment text — into the
-- app and reducing them there. That is ~21 KB of egress per render, on a site
-- with ~336k number pages: a single full crawl would cost ~7 GB, more than the
-- entire monthly egress allowance. This function computes the same values
-- server-side and returns ~1 KB, so a full crawl costs ~0.4 GB instead.
--
-- Semantics deliberately match the old TypeScript reduction:
--   * scope     — the AREA_CODE_ROW_LIMIT (100) most recent reports for the code
--   * per number — report_count = rows seen, most_common_type = modal type,
--                  latest_comment = newest non-null comment
--   * top_type  — modal value of per-number most_common_type, with numbers that
--                 have no type counted as 'Other' (matches `|| "Other"`)
--   * top_numbers — busiest first; 6 are returned so the caller can drop the
--                 number being viewed and still show 5
--
-- Returns:
--   { number_count, report_total, top_type, top_numbers: [
--       { phone_number, report_count, most_common_type, latest_comment } ] }
--
-- Idempotent — safe to re-run.

create or replace function public.get_area_summary(p_code text)
returns json
language sql
stable
as $$
  -- Filter on left(phone_number, 3) alone: that matches
  -- spam_reports_area_code_created_idx exactly, so the LIMIT is served from the
  -- index with no sort. An extra `phone_number like p_code || '%'` here would be
  -- redundant (left() is the stricter test) and pulls the planner toward the
  -- text_pattern_ops index, which still has to sort.
  with recent as (
    select phone_number, type, comment, created_at
    from public.spam_reports
    where left(phone_number, 3) = p_code
      and length(phone_number) = 10
    order by created_at desc
    limit 100
  ),
  per_number as (
    select
      r.phone_number,
      count(*)::int as report_count,
      max(r.created_at) as last_seen,
      (
        select r2.type
        from recent r2
        where r2.phone_number = r.phone_number and r2.type is not null
        group by r2.type
        order by count(*) desc, max(r2.created_at) desc
        limit 1
      ) as most_common_type,
      (
        select r3.comment
        from recent r3
        where r3.phone_number = r.phone_number and r3.comment is not null
        order by r3.created_at desc
        limit 1
      ) as latest_comment
    from recent r
    group by r.phone_number
  )
  select json_build_object(
    'number_count', (select count(*) from per_number),
    'report_total', (select coalesce(sum(report_count), 0) from per_number),
    -- Ties broken by recency, not alphabetically: most numbers in a busy area
    -- code have a single report, so ties are the common case and an
    -- alphabetical tiebreak surfaces blocks of sequential numbers instead of
    -- genuinely recent activity. phone_number is a final tiebreak only because
    -- bulk imports write identical created_at values down to the microsecond —
    -- without it the same page can order those rows differently on each ISR
    -- regeneration.
    'top_type', (
      select coalesce(most_common_type, 'Other')
      from per_number
      group by coalesce(most_common_type, 'Other')
      order by count(*) desc, max(last_seen) desc, coalesce(most_common_type, 'Other')
      limit 1
    ),
    'top_numbers', (
      select coalesce(json_agg(t), '[]'::json)
      from (
        select phone_number, report_count, most_common_type, latest_comment
        from per_number
        order by report_count desc, last_seen desc, phone_number
        limit 6
      ) t
    )
  );
$$;

grant execute on function public.get_area_summary(text) to service_role;
