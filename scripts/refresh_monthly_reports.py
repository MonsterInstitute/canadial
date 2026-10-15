"""Refresh the materialized monthly reports (current and previous month).

Run after the daily importers, like refresh_area_summaries.py. The monthly
report pages read one row of public.monthly_reports by primary key; this is
what keeps that row current. See the 20261015120000 migration for why the pages
no longer aggregate on render.

Recomputes the current and previous UTC month, one RPC call each (the
previous month still changes for the first days of a new month, and a
month's report includes its predecessor's count). Older months
only change through moderation, which refreshes the affected month itself.

Fails loudly: a silent failure would leave the current month's report frozen.
"""

import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone

URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
TIMEOUT = 60


def refresh(month):
    req = urllib.request.Request(
        f"{URL}/rest/v1/rpc/refresh_monthly_reports",
        data=json.dumps({"p_months": [month]}).encode(),
        headers={
            "apikey": KEY,
            "Authorization": f"Bearer {KEY}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        raise SystemExit(f"refresh_monthly_reports({month}) failed: HTTP {e.code} {e.read().decode()[:300]}")


# One month per call: a month is ~3-5s of database work, two in one call
# exceeded PostgREST's 8s statement timeout (measured 14.7s, 2026-10-15).
now = datetime.now(timezone.utc)
this_month = now.strftime("%Y-%m")
prev_month = (now.replace(day=1) - timedelta(days=1)).strftime("%Y-%m")

written = 0
for month in (prev_month, this_month):
    n = refresh(month)
    print(f"{month}: {n}")
    written += n if isinstance(n, int) else 0

print(f"monthly reports written: {written}")
# The current month can legitimately be empty for a few hours after midnight
# UTC on the 1st, but the previous month never is.
if written < 1:
    print(f"::error::refresh_monthly_reports wrote {written} months; expected at least 1")
    sys.exit(1)
