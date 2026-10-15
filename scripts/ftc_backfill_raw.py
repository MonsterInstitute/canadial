"""Backfill raw FTC daily CSVs into R2 through /api/admin/ftc/fetch.

    ADMIN_TOKEN=... python3 scripts/ftc_backfill_raw.py 2022-05-01 2026-10-15 > fetch_log.jsonl

One POST per calendar day; the Worker downloads the file from ftc.gov and
stores it byte for byte in R2 (days already stored are skipped). Days with
no file (weekends, holidays, before the archive starts) come back 404. A day
that keeps failing is retried a few times, then logged and left for a rerun.
Prints one JSON line per day.
"""

import concurrent.futures as cf
import json
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import date, timedelta

SITE = os.environ.get("SITE", "https://www.canadial.com").rstrip("/")
TOKEN = os.environ["ADMIN_TOKEN"]
UA = "canadial-jobs/1.0 (+https://github.com/MonsterInstitute/canadial)"


def fetch(day):
    for attempt in range(1, 6):
        req = urllib.request.Request(
            f"{SITE}/api/admin/ftc/fetch",
            data=json.dumps({"day": day}).encode(),
            headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json", "User-Agent": UA},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                return {**json.loads(r.read()), "http": r.status}
        except urllib.error.HTTPError as e:
            body = e.read().decode()[:300]
            if e.code == 404:
                return {"day": day, "http": 404, "missing": True}
            last = {"day": day, "http": e.code, "error": body}
        except Exception as e:  # network blip
            last = {"day": day, "http": -1, "error": str(e)}
        time.sleep(3 * attempt)
    return last


if __name__ == "__main__":
    start, end = date.fromisoformat(sys.argv[1]), date.fromisoformat(sys.argv[2])
    days = [(start + timedelta(n)).isoformat() for n in range((end - start).days + 1)]
    with cf.ThreadPoolExecutor(4) as ex:
        for res in ex.map(fetch, days):
            print(json.dumps(res), flush=True)
