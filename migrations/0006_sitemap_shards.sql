-- Phase 5: sitemap shards. /sitemap.xml is a sitemap index; each shard lists
-- up to 45,000 URLs (Google's limit is 50,000). Boundaries are materialized
-- daily by refresh.ts so a shard is one partial-index range read.
CREATE TABLE sitemap_shards (
  kind    TEXT NOT NULL,      -- 'numbers' | 'blocks'
  shard   INTEGER NOT NULL,
  first   INTEGER NOT NULL,   -- first phone / NPA-NXX in the shard
  last    INTEGER NOT NULL,
  n       INTEGER NOT NULL,
  lastmod TEXT,               -- latest data date in the shard (YYYY-MM-DD)
  PRIMARY KEY (kind, shard)
) WITHOUT ROWID;
