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

saved = 0
for i in range(0, len(batch), 500):
    chunk = batch[i:i + 500]
    try:
        supabase.table('spam_reports').insert(chunk, returning='minimal').execute()
        saved += len(chunk)
    except Exception:
        for rec in chunk:
            try:
                supabase.table('spam_reports').insert(rec, returning='minimal').execute()
                saved += 1
            except Exception:
                pass

print(f"Done! +{saved} new numbers from {date_str}")
