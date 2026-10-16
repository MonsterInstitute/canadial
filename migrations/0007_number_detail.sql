-- Number pages from more of each FTC complaint: when the call came, where the
-- complainant was, whether they shared the number's area code, and groups of
-- numbers in one block reported for the same thing in quick succession.
-- Additive only: safe to apply while the previous pages are live.
--
-- Per-number breakdowns are small JSON objects on `numbers` (the row a number
-- page already reads), never new rows per number. Rules in
-- scripts/ftc_aggregate.py and src/lib/ftc-ingest.ts.

-- Complaints by hour of the call (0-23) as the complainant entered it:
-- {"9":2,"14":1}. Calls entered as exactly 00:00 or 12:00 are left out (form
-- defaults: 00:00 is 5.6% of all complaints, 12:00 four times its neighbours),
-- as are complaints dated by Created_Date.
ALTER TABLE numbers ADD COLUMN ftc_hours TEXT;
-- Complaints by weekday of the call date, 0 = Sunday: {"2":1,"3":2}.
ALTER TABLE numbers ADD COLUMN ftc_wdays TEXT;
-- The 10 commonest complainant cities, "City|ST": {"Tampa|FL":3}. Merged and
-- cut to 10 after every day, in the backfill as in the daily ingest.
ALTER TABLE numbers ADD COLUMN ftc_cities TEXT;
-- Complaints whose Consumer_Area_Code is the number's own area code.
ALTER TABLE numbers ADD COLUMN ftc_local INTEGER NOT NULL DEFAULT 0;
-- campaigns.id when the number is in one (src/lib/campaigns.ts).
ALTER TABLE numbers ADD COLUMN campaign INTEGER;
-- "Other numbers in this group": a handful off one index range.
CREATE INDEX numbers_by_campaign ON numbers (campaign, phone) WHERE campaign IS NOT NULL;

-- Groups of numbers in one NPA-NXX block, with the same main FTC subject,
-- first reported within days of each other, and too many to be chance. Written
-- by the "campaigns" refresh part; read by primary key. id packs the block,
-- subject and start day: ((npanxx * 100 + subject) * 100000 + start day number),
-- so one area code's campaigns are one id range.
CREATE TABLE campaigns (
  id         INTEGER PRIMARY KEY,
  npanxx     INTEGER NOT NULL,
  subject    INTEGER NOT NULL,
  size       INTEGER NOT NULL,     -- member numbers
  first_day  INTEGER NOT NULL,     -- yyyymmdd: first member's first complaint
  last_day   INTEGER NOT NULL,     -- yyyymmdd: last member's first complaint
  complaints INTEGER NOT NULL,     -- all members' FTC complaints
  states     TEXT,                 -- top 3 complainant states [["Ohio",40],...]
  refreshed_at TEXT NOT NULL
);

-- FTC totals per NPA-NXX block, for context on numbers with few complaints.
-- Written by the "areas" refresh part (one statement per area code, only
-- changed rows); read by primary key.
CREATE TABLE block_summaries (
  npanxx     INTEGER PRIMARY KEY,
  numbers    INTEGER NOT NULL,     -- numbers in the block with FTC complaints
  complaints INTEGER NOT NULL,
  robocalls  INTEGER NOT NULL,
  first_day  INTEGER,
  last_day   INTEGER,
  subjects   TEXT                  -- top 4 [[subject id, complaints],...]
);
