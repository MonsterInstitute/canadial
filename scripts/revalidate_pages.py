"""Revalidate the cached pages the daily import just changed.

Run last in the daily workflow, after refresh_area_summaries.py. The importers
append every number they sent to $TOUCHED_NUMBERS_FILE; this posts the pages
those numbers appear on to /api/admin/revalidate (src/app/api/admin/revalidate).

Why: number pages are ISR-cached for a week (src/app/lookup/[number]/page.tsx),
and an import writes straight to the database, so without this a number that
got its first report today kept serving its cached "no reports" page for up to
seven days.

Revalidating only marks a page stale; it is re-rendered on its next visit, so
the cost is one ~1 KB render per touched page that is actually visited (see the
egress arithmetic in AGENTS.md).

Paths sent:
  * /lookup/<n> for each touched number, unless there are more than
    MAX_NUMBER_PAGES of them — then number pages are left to their weekly
    window (or a redeploy) and only the listings below are refreshed;
  * /area/<code> for each touched area code (their summaries were just
    refreshed);
  * /reports, and on the first two days of a month the new month's report, so
    a month whose URL was hit before it had data is not a cached 404 for a week.
    The endpoint expands /reports paths to their translated copies.

The homepage is not sent: it already regenerates hourly.

Without REVALIDATE_SECRET this prints a warning and exits 0, so the import job
does not fail before the secret is configured. With DRY_RUN=1 it prints the
batches instead of sending them.
"""

import json
import os
import re
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone

SITE = os.environ.get("SITE", "https://www.canadial.com").rstrip("/")
SECRET = os.environ.get("REVALIDATE_SECRET", "")
NUMBERS_FILE = os.environ.get("TOUCHED_NUMBERS_FILE", "touched_numbers.txt")
DRY_RUN = os.environ.get("DRY_RUN") == "1"
BATCH = 200  # the endpoint's per-request limit
MAX_NUMBER_PAGES = 20000
TIMEOUT = 30


def build_paths(numbers, today):
    numbers = sorted({n for n in numbers if re.fullmatch(r"[2-9]\d{9}", n)})
    codes = sorted({n[:3] for n in numbers})
    paths = []
    if len(numbers) > MAX_NUMBER_PAGES:
        print(
            f"::warning::{len(numbers)} numbers touched (> {MAX_NUMBER_PAGES}); "
            "not revalidating number pages individually. They refresh within "
            "their weekly ISR window, or redeploy to refresh them all now."
        )
    else:
        paths += [f"/lookup/{n}" for n in numbers]
    paths += [f"/area/{c}" for c in codes]
    paths.append("/reports")
    if today.day <= 2:
        paths.append(f"/reports/{today.year}/{today.month:02d}")
    return paths


def post(paths):
    req = urllib.request.Request(
        f"{SITE}/api/admin/revalidate",
        data=json.dumps({"paths": paths}).encode(),
        headers={
            "Authorization": f"Bearer {SECRET}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        raise SystemExit(f"revalidate failed: HTTP {e.code} {e.read().decode()[:300]}")


def main():
    try:
        with open(NUMBERS_FILE) as f:
            numbers = [line.strip() for line in f if line.strip()]
    except FileNotFoundError:
        numbers = []

    # Nothing written means nothing to refresh. This also matters during a
    # database outage, when the importers write nothing: revalidatePath()
    # invalidates outright rather than marking stale (measured with next start
    # against a failing database), so a revalidated page re-renders on its
    # next visit, fails, and returns a 500 instead of its last good copy.
    if not numbers:
        print("no numbers touched; nothing to revalidate")
        return
    paths = build_paths(numbers, datetime.now(timezone.utc))
    print(f"{len(numbers)} touched numbers -> {len(paths)} paths")

    if not SECRET and not DRY_RUN:
        print("::warning::REVALIDATE_SECRET is not set; skipping revalidation.")
        return

    total, skipped = 0, []
    for i in range(0, len(paths), BATCH):
        chunk = paths[i : i + BATCH]
        if DRY_RUN:
            print(f"[dry run] batch {i // BATCH + 1}: {len(chunk)} paths, e.g. {chunk[:3]}")
            continue
        res = post(chunk)
        total += res.get("revalidated", 0)
        skipped += res.get("skipped", [])

    if not DRY_RUN:
        print(f"revalidated {total} pages")
    if skipped:
        print(f"::warning::endpoint skipped {len(skipped)} paths, e.g. {skipped[:5]}")


if __name__ == "__main__":
    sys.exit(main())
