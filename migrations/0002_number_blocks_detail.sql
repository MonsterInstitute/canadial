-- Phase 3: NPA-NXX number-block data (CNAC for Canada, NANPA for the US).
--
-- number_blocks (created in 0001) gains the assignment status: a number in an
-- exchange or thousands-block that is not assigned to any carrier cannot be a
-- working subscriber line, so complaints about it point to a spoofed caller ID.
--
-- number_blocks_x holds US thousands-blocks (NPA-NXX-X) where they add
-- something to the code-level row: the block belongs to a different carrier
-- than the code holder (number pooling), or the block is not assigned at all.
-- A number page reads one row from each by primary key.
ALTER TABLE number_blocks ADD COLUMN status TEXT;
ALTER TABLE number_blocks ADD COLUMN pooled INTEGER NOT NULL DEFAULT 0;

CREATE TABLE number_blocks_x (
  npanxxx INTEGER PRIMARY KEY,           -- 4165551 = 416-555-1xxx
  status  TEXT NOT NULL,                 -- 'assigned' | 'available'
  carrier TEXT,
  ocn     TEXT
);
