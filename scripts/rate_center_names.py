"""Build rate_center_names: NANPA rate centres -> Census place names.

    python3 -I scripts/rate_center_names.py GAZETTEER_PLACES.txt NANPA_CO.zip OUT.sql

GAZETTEER_PLACES.txt is the U.S. Census Gazetteer national places file
(public domain), NANPA_CO.zip the CO code assignment archive. A rate centre
gets a name only when its letters equal exactly one Census place's letters in
the same state (suffixes like "city" and "CDP" removed). No fuzzy matching:
a wrong city is worse than the raw abbreviation.
"""
import csv, io, re, sys, zipfile
from collections import defaultdict

GAZ, CO, OUT = sys.argv[1:4]
squash = lambda s: re.sub(r"[^A-Z]", "", s.upper())
places = defaultdict(dict)
for r in csv.DictReader(open(GAZ, encoding="latin-1"), delimiter="|"):
    toks = r["NAME"].split(" ")
    while len(toks) > 1 and (toks[-1] == toks[-1].lower() or toks[-1] == "CDP"):
        toks.pop()
    name, k = " ".join(toks), squash(" ".join(toks))
    prev = places[r["USPS"]].get(k, name)
    places[r["USPS"]][k] = name if prev == name else None  # two different places: ambiguous
z = zipfile.ZipFile(CO)
rd = csv.reader(io.StringIO(z.read(z.namelist()[0]).decode("latin-1")), delimiter="\t")
next(rd)
seen, rows = set(), []
for r in rd:
    r = [c.strip() for c in r]
    if len(r) < 5 or (r[0], r[4]) in seen:
        continue
    seen.add((r[0], r[4]))
    name = places.get(r[0], {}).get(squash(r[4]))
    if name:
        rows.append((r[0], r[4], name))
q = lambda s: "'" + s.replace("'", "''") + "'"
with open(OUT, "w") as f:
    f.write("DELETE FROM rate_center_names;\n")
    for i in range(0, len(rows), 300):
        f.write("INSERT INTO rate_center_names (state, rate_center, name) VALUES " + ",".join(f"({q(a)},{q(b)},{q(c)})" for a, b, c in rows[i:i + 300]) + ";\n")
print(f"{len(rows)} of {len(seen)} rate centres named")
