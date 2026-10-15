"""Shared helpers for the daily jobs: write through the site's admin API.

All database access goes through the Worker (src/app/api/admin/*), so the
workflow holds one secret, ADMIN_TOKEN, and no database credentials.
"""

import json
import os
import urllib.error
import urllib.request

SITE = os.environ.get("SITE", "https://www.canadial.com").rstrip("/")
TOKEN = os.environ.get("ADMIN_TOKEN", "")
TIMEOUT = 300
# Cloudflare rejects urllib's default "Python-urllib" user agent (error 1010).
USER_AGENT = "canadial-jobs/1.0 (+https://github.com/MonsterInstitute/canadial)"


def post(path, payload=None):
    if not TOKEN:
        raise SystemExit("ADMIN_TOKEN is not set")
    req = urllib.request.Request(
        f"{SITE}{path}",
        data=json.dumps(payload or {}).encode(),
        headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json", "User-Agent": USER_AGENT},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        raise SystemExit(f"POST {path} failed: HTTP {e.code} {e.read().decode()[:300]}")


def record_touched(numbers):
    """Append numbers to $TOUCHED_NUMBERS_FILE for scripts/revalidate_pages.py,
    which refreshes their cached pages after the import. No-op when unset."""
    path = os.environ.get("TOUCHED_NUMBERS_FILE")
    if path and numbers:
        with open(path, "a") as f:
            f.writelines(f"{n}\n" for n in numbers)


def import_rows(source, rows, batch=500):
    """Send rows to /api/admin/import. Returns (sent, inserted)."""
    sent = inserted = 0
    for i in range(0, len(rows), batch):
        res = post("/api/admin/import", {"source": source, "rows": rows[i:i + batch]})
        sent += res.get("received", 0)
        inserted += res.get("inserted", 0)
        if res.get("rejected"):
            print(f"::warning::{len(res['rejected'])} rows rejected in batch {i // batch + 1}")
        record_touched(res.get("touched", []))
    return sent, inserted
