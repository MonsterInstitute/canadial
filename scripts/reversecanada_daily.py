"""Daily importer for Canadian community-reported numbers from reversecanada.com.

Scrapes the reversecanada.com homepage for the numbers it currently features
(linked as /lookup/XXXXXXXXXX/), then inserts any we haven't already recorded
from this source. Credentials come from the environment (GitHub Actions secrets).
"""

import os, re, requests
from bs4 import BeautifulSoup
from supabase import create_client

SUPABASE_URL = os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in environment')
    raise SystemExit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

HEADERS = {'User-Agent': 'Mozilla/5.0 (compatible; CanadialBot/1.0; +https://www.canadial.com)'}
HOMEPAGE = 'https://www.reversecanada.com/'
SOURCE = 'reversecanada_com'
COMMENT = 'Reported by Canadian community members as suspicious or unwanted.'


def normalize(p):
    d = re.sub(r'\D', '', str(p or ''))
    if len(d) == 11 and d[0] == '1':
        d = d[1:]
    return d if len(d) == 10 else None


# 1. Scrape the homepage for /lookup/XXXXXXXXXX/ links.
print(f"Fetching {HOMEPAGE} ...")
resp = requests.get(HOMEPAGE, headers=HEADERS, timeout=30)
resp.raise_for_status()

soup = BeautifulSoup(resp.text, 'lxml')
found = set()
for a in soup.find_all('a', href=True):
    # Links carry 10-digit numbers, sometimes with a leading country-code "1"
    # (e.g. /lookup/18552405425/). Capture the full digit run and let
    # normalize() reduce it to the canonical 10-digit form.
    m = re.search(r'/lookup/(\d{10,11})', a['href'])
    if m:
        n = normalize(m.group(1))
        if n:
            found.add(n)

print(f"Found {len(found)} numbers on the reversecanada.com homepage")
if not found:
    print("No numbers found; exiting.")
    raise SystemExit(0)

# 2. Skip numbers we've already imported from this source, so re-runs don't
#    create duplicate reports for the same featured numbers.
nums = list(found)
existing = set()
for i in range(0, len(nums), 100):
    chunk = nums[i:i + 100]
    try:
        res = (
            supabase.table('spam_reports')
            .select('phone_number')
            .eq('source', SOURCE)
            .in_('phone_number', chunk)
            .execute()
        )
        for row in res.data or []:
            existing.add(row['phone_number'])
    except Exception as e:
        print(f"Lookup of existing numbers failed (continuing): {e}")

new_nums = [n for n in nums if n not in existing]
print(f"{len(new_nums)} new numbers to insert ({len(existing)} already known)")
if not new_nums:
    print("Nothing new; exiting.")
    raise SystemExit(0)

# 3. Insert the new numbers, matching the shape of existing reversecanada rows.
batch = [{
    'phone_number': n,
    'is_spam': True,
    'type': 'Other',
    'comment': COMMENT,
    'source': SOURCE,
    'ip_hash': 'community_report',
} for n in new_nums]

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

print(f"Done! +{saved} new numbers from reversecanada.com")
