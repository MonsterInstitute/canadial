"""Daily importer for the US FTC Do Not Call complaint dataset.

Fetches yesterday's public FTC complaint CSV, classifies each number, and
inserts new spam reports. Credentials come from the environment (set as GitHub
Actions secrets), not a local .env file.
"""

import requests, csv, re, io, os
from datetime import datetime, timedelta
from supabase import create_client

SUPABASE_URL = os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in environment')
    raise SystemExit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

HEADERS = {'User-Agent': 'Mozilla/5.0'}


def normalize(p):
    d = re.sub(r'\D', '', str(p or ''))
    if len(d) == 11 and d[0] == '1':
        d = d[1:]
    return d if len(d) == 10 else None


def classify(s, r):
    s = (s or '').lower()
    if any(w in s for w in ['tax', 'irs', 'government', 'warrant', 'arrest', 'social security', 'immigration', 'imposter']):
        return 'Scam'
    if any(w in s for w in ['debt', 'credit', 'loan', 'mortgage']):
        return 'Debt Collector'
    if r == 'Y':
        return 'Robocall'
    if any(w in s for w in ['solar', 'insurance', 'warranty', 'medical', 'energy']):
        return 'Telemarketer'
    return 'Other'


# Get yesterday's file
yesterday = datetime.now() - timedelta(days=1)
date_str = yesterday.strftime('%Y-%m-%d')
url = f"https://www.ftc.gov/sites/default/files/DNC_Complaint_Numbers_{date_str}.csv"

print(f"Fetching FTC data for {date_str}...")
r = requests.get(url, headers=HEADERS, timeout=30)
if r.status_code != 200:
    print(f"File not available: {r.status_code}")
    raise SystemExit(0)

rows = list(csv.DictReader(io.StringIO(r.content.decode('utf-8', 'replace'))))
batch = []
seen = set()

for row in rows:
    p = normalize(row.get('Company_Phone_Number', ''))
    if not p or p in seen:
        continue
    seen.add(p)
    s = row.get('Subject', '')
    rb = row.get('Recorded_Message_Or_Robocall', 'N')
    batch.append({
        'phone_number': p,
        'is_spam': True,
        'type': classify(s, rb),
        'comment': f"Reported to FTC Do Not Call registry{' — ' + s if s else ''}",
        'source': 'ftc_dnc',
        'ip_hash': 'ftc_open_data',
    })

# spam_reports.dedupe_key is a generated md5 of (phone_number, comment, source)
# with a unique index, so re-importing a report we already hold is skipped by
# the database instead of inserting a duplicate. Before this, repeated imports
# of overlapping source data left 17,374 duplicate rows and inflated the report
# counts shown for 8,875 numbers. ignore_duplicates maps to
# ON CONFLICT (dedupe_key) DO NOTHING.
#
# `saved` therefore counts rows *sent*, not rows stored — the database does not
# report how many it skipped.
sent = 0
for i in range(0, len(batch), 500):
    chunk = batch[i:i + 500]
    try:
        (
            supabase.table('spam_reports')
            .upsert(chunk, on_conflict='dedupe_key',
                    ignore_duplicates=True, returning='minimal')
            .execute()
        )
        sent += len(chunk)
    except Exception as e:
        print(f"Batch insert failed, retrying row by row: {e}")
        for rec in chunk:
            try:
                (
                    supabase.table('spam_reports')
                    .upsert(rec, on_conflict='dedupe_key',
                            ignore_duplicates=True, returning='minimal')
                    .execute()
                )
                sent += 1
            except Exception:
                pass
saved = sent

print(f"Done! {saved} rows sent for {date_str} (duplicates skipped by the database)")
