"""Rebuild per-number counters and every materialized rollup after the imports.

Calls POST /api/admin/refresh (src/lib/refresh.ts), which recomputes the
numbers table, area_summaries, site_stats and monthly_reports in D1. Must run
after the importers: it summarises what they just wrote. Fails loudly, since a
silent failure would leave every page serving stale context.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from canadial_admin import post_status  # noqa: E402

# One part per request, in order (see REFRESH_PARTS in src/lib/refresh.ts):
# each is well under a minute, where the whole refresh in one request was
# fragile. A failed part is retried once, then the step fails naming it.
for part in ["community", "areas", "stats", "monthly", "hubs"]:
    for attempt in (1, 2):
        status, res = post_status("/api/admin/refresh", {"part": part})
        print(part, status, res)
        if status == 200 and res.get("ok"):
            break
    else:
        print(f"::error::refresh part '{part}' failed")
        sys.exit(1)
