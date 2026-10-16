-- Blue/green data for the Phase 4 pages, so they can be previewed on staging
-- against the shared database without changing what the live pages read.
--
-- The previous pages read numbers.comm_* (which count the old one-row FTC
-- imports as community reports) and area_summaries / site_stats /
-- monthly_reports. The new pages read numbers.c_* (community reports only)
-- and the *2 tables, maintained by the new refresh. At release the new code
-- takes over; the old columns and tables are dropped by a later migration once
-- the rollback window has passed.
ALTER TABLE numbers RENAME COLUMN comm_types TO c_types;
ALTER TABLE numbers ADD COLUMN c_total INTEGER NOT NULL DEFAULT 0;
ALTER TABLE numbers ADD COLUMN c_spam INTEGER NOT NULL DEFAULT 0;
ALTER TABLE numbers ADD COLUMN c_last TEXT;
ALTER TABLE numbers ADD COLUMN c_top_type TEXT;
ALTER TABLE numbers ADD COLUMN listed INTEGER NOT NULL DEFAULT 0;
CREATE INDEX numbers_listed ON numbers (phone) WHERE listed = 1;

CREATE TABLE area_summaries2  (code INTEGER PRIMARY KEY, payload TEXT NOT NULL, refreshed_at TEXT NOT NULL);
CREATE TABLE site_stats2      (id INTEGER PRIMARY KEY CHECK (id = 1), payload TEXT NOT NULL, refreshed_at TEXT NOT NULL);
CREATE TABLE monthly_reports2 (ym TEXT PRIMARY KEY, payload TEXT NOT NULL, refreshed_at TEXT NOT NULL);
