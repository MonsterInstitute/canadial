"""Daily importer for the US FTC Do Not Call complaint data.

Reads the FTC DNC Reported Calls API (api.ftc.gov), not the daily CSV files:
ftc.gov answers scripted clients with a 1.3 KB HTML "404" page even when a
file exists, so the CSV importer silently fetched nothing on most days from
August to October 2026. The API answers normally (FTC_API_KEY, an
api.data.gov key; 20,000 requests/hour).

Window: complaints created in the last LOOKBACK_DAYS days. A day's complaints
are uploaded around noon Eastern the next weekday, so at 08:00 UTC yesterday
is often still empty; re-reading recent days is harmless because rows are
deduplicated on (phone, comment, source).

Row shape is unchanged from the CSV importer: one report per number per
subject, "Reported to FTC Do Not Call registry — <subject>". That model drops
complaint counts; Phase 2 replaces it with per-number aggregates.
"""

import json
import os
import re
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from canadial_admin import import_rows  # noqa: E402

API = "https://api.ftc.gov/v0/dnc-complaints"
KEY = os.environ.get("FTC_API_KEY", "")
LOOKBACK_DAYS = 4
PAGE = 50  # the API's maximum


def normalize(p):
    d = re.sub(r"\D", "", str(p or ""))
    if len(d) == 11 and d[0] == "1":
        d = d[1:]
    return d if len(d) == 10 else None


def classify(s, r):
    s = (s or "").lower()
    if any(w in s for w in ["tax", "irs", "government", "warrant", "arrest", "social security", "immigration", "imposter"]):
        return "Scam"
    if any(w in s for w in ["debt", "credit", "loan", "mortgage"]):
        return "Debt Collector"
    if r == "Y":
        return "Robocall"
    if any(w in s for w in ["solar", "insurance", "warranty", "medical", "energy"]):
        return "Telemarketer"
    return "Other"


def fetch_day(day):
    out, offset = [], 0
    while True:
        q = urllib.parse.urlencode({"created_date": f'"{day}"', "items_per_page": PAGE, "offset": offset})
        req = urllib.request.Request(f"{API}?{q}", headers={"X-Api-Key": KEY})
        with urllib.request.urlopen(req, timeout=60) as r:
            data = json.load(r).get("data") or []
        out += [d.get("attributes", {}) for d in data]
        if len(data) < PAGE:
            return out
        offset += PAGE


if not KEY:
    raise SystemExit("FTC_API_KEY is not set")

today = datetime.now(timezone.utc).date()
rows, seen, fetched = [], set(), 0
for back in range(LOOKBACK_DAYS, 0, -1):
    day = (today - timedelta(days=back)).isoformat()
    records = fetch_day(day)
    fetched += len(records)
    print(f"{day}: {len(records)} complaints")
    for a in records:
        p = normalize(a.get("company-phone-number"))
        if not p:
            continue  # the API carries some malformed rows
        s = (a.get("subject") or "").strip()
        comment = f"Reported to FTC Do Not Call registry{' — ' + s if s else ''}"
        if (p, comment) in seen:
            continue
        seen.add((p, comment))
        rows.append({
            "phone_number": p,
            "type": classify(s, a.get("recorded-message-or-robocall")),
            "comment": comment,
        })

# Every weekday has thousands of complaints; four days with none means the API
# or the key is broken, not a quiet week.
if fetched == 0:
    print(f"::error::FTC API returned no complaints for the last {LOOKBACK_DAYS} days")
    raise SystemExit(1)

sent, inserted = import_rows("ftc_dnc", rows)
print(f"Done: {fetched} complaints, {sent} rows sent, {inserted} new (duplicates skipped)")
