"""Rebuild per-number counters and every materialized rollup after the imports.

Calls POST /api/admin/refresh (src/lib/refresh.ts), which recomputes the
numbers table, area_summaries, site_stats and monthly_reports in D1. Must run
after the importers: it summarises what they just wrote. Fails loudly, since a
silent failure would leave every page serving stale context.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from canadial_admin import post  # noqa: E402

res = post("/api/admin/refresh")
print(res)
if not res.get("ok"):
    print("::error::refresh failed")
    sys.exit(1)
