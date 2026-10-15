-- canadial on Cloudflare D1: initial schema.
--
-- The design rule from AGENTS.md carries over with a different currency: on
-- Supabase an unbounded read cost egress (5 GB/month, and the site went dark
-- three times); on D1 it costs rows read, billed per row scanned. Every page
-- render must read a bounded number of rows that does not grow with the data.
-- That is why counters live on `numbers` and summaries are materialized: a
-- number page reads one `numbers` row and a handful of indexed rows, never a
-- scan.
--
-- Phone numbers are INTEGER (4165551234): an INTEGER PRIMARY KEY is the rowid
-- itself, 8 bytes, no separate index.

-- One row per number that has any data. Counters are maintained by every
-- writer (community report insert, moderation, the FTC import) so a render
-- never counts rows.
CREATE TABLE numbers (
  phone          INTEGER PRIMARY KEY,
  -- Community / legacy reports (the `reports` table), visible rows only.
  comm_total     INTEGER NOT NULL DEFAULT 0,
  comm_spam      INTEGER NOT NULL DEFAULT 0,
  comm_top_type  TEXT,
  comm_last      TEXT,                 -- ISO timestamp of the newest visible report
  -- FTC Do Not Call complaints, aggregated (Phase 2). Raw files live in R2.
  ftc_total      INTEGER NOT NULL DEFAULT 0,
  ftc_robocall   INTEGER NOT NULL DEFAULT 0,
  ftc_first      INTEGER,              -- yyyymmdd
  ftc_last       INTEGER,              -- yyyymmdd
  -- Phase 5 sitemap rule, recomputed by the import.
  indexable      INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX numbers_indexable ON numbers (phone) WHERE indexable = 1;

-- Per-number FTC breakdowns. WITHOUT ROWID: the primary key is the table, so
-- "all months for this number" is one contiguous range read.
CREATE TABLE ftc_monthly (
  phone INTEGER NOT NULL, ym INTEGER NOT NULL, n INTEGER NOT NULL,
  PRIMARY KEY (phone, ym)
) WITHOUT ROWID;
CREATE TABLE ftc_states (
  phone INTEGER NOT NULL, state TEXT NOT NULL, n INTEGER NOT NULL,
  PRIMARY KEY (phone, state)
) WITHOUT ROWID;
CREATE TABLE ftc_subjects (
  phone INTEGER NOT NULL, subject INTEGER NOT NULL, n INTEGER NOT NULL,
  PRIMARY KEY (phone, subject)
) WITHOUT ROWID;
CREATE TABLE ftc_subject_names (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);

-- One row per FTC day applied. The daily job writes a day's aggregates and its
-- log row in one batch, and refuses a day already logged, so re-running an
-- import can never double-count. The raw file is kept in R2 at r2_key, which
-- is what makes every aggregate rebuildable from scratch.
CREATE TABLE ftc_ingest_log (
  day TEXT PRIMARY KEY, records INTEGER NOT NULL, valid INTEGER NOT NULL,
  sha256 TEXT NOT NULL, r2_key TEXT NOT NULL, applied_at TEXT NOT NULL
);

-- Community and legacy (non-FTC) reports, one row per report. Moderation hides
-- rows; nothing deletes them.
CREATE TABLE reports (
  id            TEXT PRIMARY KEY,
  phone         INTEGER NOT NULL,
  is_spam       INTEGER NOT NULL DEFAULT 1,
  type          TEXT,
  comment       TEXT,
  source        TEXT,
  ip_hash       TEXT,
  created_at    TEXT NOT NULL,
  hidden        INTEGER NOT NULL DEFAULT 0,
  hidden_reason TEXT,
  dedupe_key    TEXT UNIQUE
);
CREATE INDEX reports_by_phone ON reports (phone, created_at DESC) WHERE hidden = 0;
CREATE INDEX reports_recent   ON reports (created_at DESC) WHERE hidden = 0 AND is_spam = 1;

CREATE TABLE organizations (
  id INTEGER PRIMARY KEY,
  phone INTEGER NOT NULL UNIQUE,
  name TEXT, department TEXT, category TEXT, description TEXT, hours TEXT, tip TEXT, slug TEXT, website TEXT
);

CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT, email TEXT,
  tier TEXT NOT NULL DEFAULT 'free',
  monthly_limit INTEGER NOT NULL DEFAULT 100,
  usage_count INTEGER NOT NULL DEFAULT 0,
  usage_reset_at TEXT,
  created_at TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1
);

-- Materialized rollups, one row each, refreshed by the daily job. A render
-- reads one row by primary key. payload is the same JSON shape the Supabase
-- RPCs returned, so page code is unchanged.
CREATE TABLE area_summaries  (code INTEGER PRIMARY KEY, payload TEXT NOT NULL, refreshed_at TEXT NOT NULL);
CREATE TABLE site_stats      (id INTEGER PRIMARY KEY CHECK (id = 1), payload TEXT NOT NULL, refreshed_at TEXT NOT NULL);
CREATE TABLE monthly_reports (ym TEXT PRIMARY KEY, payload TEXT NOT NULL, refreshed_at TEXT NOT NULL);

-- NPA-NXX block data (Phase 3): rate centre, region, carrier per exchange.
CREATE TABLE number_blocks (
  npanxx INTEGER PRIMARY KEY,           -- 416555
  country TEXT NOT NULL, region TEXT, rate_center TEXT, carrier TEXT, ocn TEXT,
  source TEXT NOT NULL, as_of TEXT NOT NULL
);
