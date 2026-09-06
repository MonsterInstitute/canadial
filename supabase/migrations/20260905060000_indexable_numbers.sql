-- The number pages worth putting in the sitemap, in one query.
--
-- The sitemap has listed only core pages and area codes since the egress
-- incident, because listing all ~307k number pages meant the sitemap sharded
-- and every shard re-scanned the whole table. That is fixed, and a number page
-- now costs 1,473 bytes to render, so the sitemap can carry number pages again
-- — but not all of them, and not for cost reasons.
--
-- 96.5% of numbers (307,114) have exactly one report, and 281,158 FTC rows
-- share just 20 distinct comment texts, the most common covering 133,596
-- numbers. Those pages are near-identical boilerplate; Google already crawled
-- them when the sitemap listed 3.3M URLs and declined to index them. Listing
-- them again would spend crawl budget to be ignored.
--
-- What is left is the subset with something specific to say:
--   * two or more reports — the number has been seen more than once, and the
--     page carries a real report count and more than one comment
--   * organizations — a named, verified business, unique by definition
-- ~11,300 numbers, against 723 core and area-code URLs.
--
-- Index-only by design. The grouping needs every visible row's phone_number,
-- which was a 3.5s parallel sequential scan until
-- spam_reports_visible_phone_idx; with it, and once VACUUM has set the
-- visibility map, it is an index-only scan at 299ms with 124 heap fetches. The
-- sitemap regenerates daily, so this is one such query per day.
--
-- Returns a JSON array of 10-digit strings, ~150 KB for 11.3k numbers.
-- Idempotent — safe to re-run.

create index if not exists spam_reports_visible_phone_idx
  on public.spam_reports (phone_number)
  where not hidden;

create or replace function public.get_indexable_numbers(p_min_reports int default 2)
returns json
language sql
stable
as $$
  select coalesce(json_agg(phone_number order by phone_number), '[]'::json)
  from (
    select phone_number
    from public.spam_reports
    where not hidden
      and length(phone_number) = 10
      and left(phone_number, 1) between '2' and '9'
    group by phone_number
    having count(*) >= greatest(p_min_reports, 1)

    union

    -- Verified organizations: always worth a page, however few reports exist.
    select phone_number
    from public.organizations
    where length(phone_number) = 10
      and left(phone_number, 1) between '2' and '9'
  ) t;
$$;

grant execute on function public.get_indexable_numbers(int) to service_role;
