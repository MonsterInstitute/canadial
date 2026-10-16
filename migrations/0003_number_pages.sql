-- Phase 4: number pages built around the FTC aggregates and block data.
-- Additive only: safe to apply while the previous pages are live.

-- "Other reported numbers in the same block": one index range, newest-first
-- ranking by total complaints, so a page reads only the handful it shows.
-- Queries must use these exact expressions to hit the index.
CREATE INDEX numbers_by_block ON numbers (phone / 10000, (ftc_total + comm_total) DESC);

-- Community report types per number, materialized by refresh.ts so a page
-- doesn't group a number's reports at render time: {"Scam":3,"Other":1}.
ALTER TABLE numbers ADD COLUMN comm_types TEXT;

-- Real page views, counted from a client-side beacon (bots that don't run JS
-- never send it; the endpoint also drops known bot agents and repeats from the
-- same visitor within a day). One upsert per counted view.
CREATE TABLE number_views (
  phone      INTEGER PRIMARY KEY,
  total      INTEGER NOT NULL DEFAULT 0,
  week_start TEXT NOT NULL,            -- Monday (UTC) of the week `week` counts
  week       INTEGER NOT NULL DEFAULT 0
);

-- "Did this number call you?" tallies. One row per number; one write per
-- accepted answer (one answer per visitor per number per 30 days).
CREATE TABLE number_feedback (
  phone        INTEGER PRIMARY KEY,
  yes          INTEGER NOT NULL DEFAULT 0,
  no           INTEGER NOT NULL DEFAULT 0,
  scam         INTEGER NOT NULL DEFAULT 0,
  telemarketer INTEGER NOT NULL DEFAULT 0,
  robocall     INTEGER NOT NULL DEFAULT 0,
  debt         INTEGER NOT NULL DEFAULT 0,
  silent       INTEGER NOT NULL DEFAULT 0,
  other        INTEGER NOT NULL DEFAULT 0
);

-- Busiest numbers in each FTC daily file (top 100), written by the ingest.
-- Powers "Trending today" with a primary-key range read.
CREATE TABLE ftc_daily_top (
  day   TEXT NOT NULL,
  rank  INTEGER NOT NULL,
  phone INTEGER NOT NULL,
  n     INTEGER NOT NULL,
  PRIMARY KEY (day, rank)
) WITHOUT ROWID;

-- Scam-type hub pages: the top numbers per hub, materialized by refresh.ts.
CREATE TABLE hub_numbers (
  hub   TEXT NOT NULL,
  rank  INTEGER NOT NULL,
  phone INTEGER NOT NULL,
  n     INTEGER NOT NULL,
  PRIMARY KEY (hub, rank)
) WITHOUT ROWID;
CREATE TABLE hub_stats (hub TEXT PRIMARY KEY, payload TEXT NOT NULL, refreshed_at TEXT NOT NULL);

-- Trust pages: number-removal requests and contact messages, read through the
-- admin API. Never shown publicly.
CREATE TABLE removal_requests (
  id         TEXT PRIMARY KEY,
  phone      INTEGER NOT NULL,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  relationship TEXT,
  reason     TEXT NOT NULL,
  created_at TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'open',
  resolution TEXT
);
CREATE TABLE contact_messages (
  id         TEXT PRIMARY KEY,
  name       TEXT,
  email      TEXT NOT NULL,
  message    TEXT NOT NULL,
  created_at TEXT NOT NULL
);
