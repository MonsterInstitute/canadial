-- Proper place names for US rate centres. NANPA writes rate centres as
-- 10-character abbreviations ("COCOABEACH", "WARRENVL"). Where the squashed
-- abbreviation exactly equals a squashed U.S. Census Gazetteer place name in
-- the same state ("Cocoa Beach"), that name is reliable and pages use it;
-- anything else is shown as the raw rate centre, labelled as such
-- (scripts/rate_center_names.py builds this table; Census data is public domain).
CREATE TABLE rate_center_names (
  state       TEXT NOT NULL,
  rate_center TEXT NOT NULL,
  name        TEXT NOT NULL,
  PRIMARY KEY (state, rate_center)
) WITHOUT ROWID;
