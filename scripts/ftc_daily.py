"""Daily FTC Do Not Call update: raw file to R2, then into the aggregates.

For each of the last LOOKBACK_DAYS days, oldest first:
  1. POST /api/admin/ftc/fetch  — the Worker downloads that day's
     DNC_Complaint_Numbers_<day>.csv from ftc.gov and stores it byte for byte
     in R2 (skipped if already stored). It runs in the Worker because ftc.gov
     answers scripted clients elsewhere (including GitHub's runners) with an
     HTML "404".
  2. POST /api/admin/ftc/ingest — adds that day's complaints to the per-number
     aggregates (numbers.ftc_*, ftc_monthly, ftc_states, ftc_subjects). Each
     day is applied exactly once; already-applied days are no-ops.

Re-reading a week each run means a missed run, or a file the FTC posts late,
is picked up the next day. The FTC posts weekdays; a weekday with no file for
the whole window means something is broken, and the step fails.
"""

import os
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from canadial_admin import post_status  # noqa: E402

LOOKBACK_DAYS = 7

today = datetime.now(timezone.utc).date()
days = [(today - timedelta(days=n)).isoformat() for n in range(LOOKBACK_DAYS, 0, -1)]
stored = applied = 0
for day in days:
    status, res = post_status("/api/admin/ftc/fetch", {"day": day})
    if status == 404:
        print(f"{day}: no FTC file")
        continue
    if status != 200:
        print(f"::error::{day}: fetch failed: HTTP {status} {res}")
        sys.exit(1)
    stored += 1
    status, res = post_status("/api/admin/ftc/ingest", {"day": day})
    if status != 200:
        print(f"::error::{day}: ingest failed: HTTP {status} {res}")
        sys.exit(1)
    print(f"{day}: {res}")
    if res.get("status") == "applied":
        applied += 1

print(f"{stored} files in the last {LOOKBACK_DAYS} days, {applied} newly applied")
if stored == 0:
    print(f"::error::no FTC file found for any of the last {LOOKBACK_DAYS} days")
    sys.exit(1)
