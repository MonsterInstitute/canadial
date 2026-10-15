"""Daily importer for Canadian community-reported numbers from reversecanada.com.

Scrapes the reversecanada.com homepage for the numbers it currently features
(linked as /lookup/XXXXXXXXXX/), then inserts any we haven't already recorded
from this source. Writes through the site's admin API (scripts/canadial_admin.py).
"""

import os, re, sys, requests
from bs4 import BeautifulSoup

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from canadial_admin import import_rows  # noqa: E402

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

# 2. Insert, matching the shape of existing reversecanada rows. Numbers we
#    already hold from this source are skipped by the database: the row's
#    dedupe_key (md5 of phone, comment, source) is unique.
rows = [{"phone_number": n, "type": "Other", "comment": COMMENT} for n in sorted(found)]
sent, inserted = import_rows(SOURCE, rows)
print(f"Done! {sent} rows sent from reversecanada.com, {inserted} new")
