"""Rebuild the per-area-code rollup that every number page reads.

Run after the daily importers, since it summarises what they just inserted.

Why this is chunked rather than one call: a full refresh is ~20s of database
work, and PostgREST's authenticator role has statement_timeout=8s. The timeout
cannot be raised from the function — it is armed when the outer statement
begins, before any SET inside the function applies — so the work is split
instead. refresh_area_summaries() takes the codes to process and loops over
them internally, each iteration a plain indexed equality on one area code.

Chunk size is deliberately conservative: at 50 codes a chunk peaked at 6.2s
against the 8s limit, at 25 it peaks well under 500ms. The margin matters
because toll-free codes keep growing.
"""

import json
import os
import sys
import urllib.error
import urllib.request

URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
CHUNK = 25
TIMEOUT = 60


def rpc(name, payload):
    req = urllib.request.Request(
        f"{URL}/rest/v1/rpc/{name}",
        data=json.dumps(payload).encode(),
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
        body = e.read().decode()[:300]
        raise SystemExit(f"{name} failed: HTTP {e.code} {body}")


# get_area_code_counts() already returns exactly the valid, visible area codes
# the site knows about, so it doubles as the work list.
codes = sorted(rpc("get_area_code_counts", {}).keys())
if not codes:
    raise SystemExit("no area codes returned; refusing to continue")

print(f"refreshing {len(codes)} area codes in chunks of {CHUNK}")

refreshed = 0
for i in range(0, len(codes), CHUNK):
    chunk = codes[i : i + CHUNK]
    n = rpc("refresh_area_summaries", {"p_codes": chunk})
    if not isinstance(n, int):
        raise SystemExit(f"unexpected response for {chunk[0]}..{chunk[-1]}: {n!r}")
    refreshed += n

print(f"area codes refreshed: {refreshed}")

# A partial refresh would leave some pages serving stale area context with no
# other signal, so treat anything short of the full list as a failure.
if refreshed < len(codes):
    print(f"::error::only {refreshed} of {len(codes)} codes refreshed")
    sys.exit(1)
