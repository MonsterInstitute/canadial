"""Refresh the materialized monthly reports (current and previous month).

Run after the daily importers, like refresh_area_summaries.py. The monthly
report pages read one row of public.monthly_reports by primary key; this is
what keeps that row current. See the 20261015120000 migration for why the pages
no longer aggregate on render.

Called with no arguments, refresh_monthly_reports() recomputes the current and
previous UTC month (the previous month still changes for the first days of a
new month, and a month's report includes its predecessor's count). Older months
only change through moderation, which refreshes the affected month itself.

Fails loudly: a silent failure would leave the current month's report frozen.
"""

import json
import os
import sys
import urllib.error
import urllib.request

URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
TIMEOUT = 60

req = urllib.request.Request(
    f"{URL}/rest/v1/rpc/refresh_monthly_reports",
    data=b"{}",
    headers={
        "apikey": KEY,
        "Authorization": f"Bearer {KEY}",
        "Content-Type": "application/json",
    },
    method="POST",
)
try:
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        written = json.loads(r.read().decode())
except urllib.error.HTTPError as e:
    raise SystemExit(f"refresh_monthly_reports failed: HTTP {e.code} {e.read().decode()[:300]}")

print(f"monthly reports written: {written}")
# The current month can legitimately be empty for a few hours after midnight
# UTC on the 1st, but the previous month never is.
if not isinstance(written, int) or written < 1:
    print(f"::error::refresh_monthly_reports wrote {written!r} months; expected at least 1")
    sys.exit(1)
