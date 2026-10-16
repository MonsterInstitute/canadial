"""Backfill ftc_daily_top (each day's 100 busiest numbers) from raw files.

    python3 -I scripts/ftc_daily_top_backfill.py RAW_DIR DAYS OUT.sql

Applies scripts/ftc_aggregate.py's rules (7-file dedupe window, phone
normalization) to the last DAYS files, so the counts match what the daily
ingest writes for new days.
"""
import csv
import hashlib
import os
import re
import sys
from collections import Counter, deque
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
RAW, DAYS, OUT = sys.argv[1], int(sys.argv[2]), sys.argv[3]
files = sorted(f for f in os.listdir(RAW) if re.fullmatch(r"DNC_Complaint_Numbers_\d{4}-\d{2}-\d{2}\.csv", f))
recent = deque(maxlen=7)
stmts = []


def phone(raw):
    d = re.sub(r"\D", "", raw or "")
    if len(d) == 11 and d[0] == "1":
        d = d[1:]
    return int(d) if len(d) == 10 and d[0] in "23456789" else None


for idx, f in enumerate(files):
    day = date.fromisoformat(f[22:32])
    window = [h for d, h in recent if d >= day - timedelta(days=21)]
    this, counts = set(), Counter()
    with open(os.path.join(RAW, f), newline="", encoding="utf-8", errors="replace") as fh:
        reader = csv.reader(fh)
        next(reader, None)
        for row in reader:
            if len(row) != 8:
                continue
            h = int.from_bytes(hashlib.blake2b("\x1f".join(row).encode(), digest_size=8).digest(), "big")
            dup = h in this or any(h in w for w in window)
            this.add(h)
            if dup:
                continue
            p = phone(row[0])
            if p is not None:
                counts[p] += 1
    recent.append((day, this))
    if idx >= len(files) - DAYS and counts:
        top = sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))[:100]
        vals = ",".join(f"('{day.isoformat()}',{i + 1},{p},{n})" for i, (p, n) in enumerate(top))
        stmts.append(f"INSERT OR REPLACE INTO ftc_daily_top (day, rank, phone, n) VALUES {vals};")
open(OUT, "w").write("\n".join(stmts) + "\n")
print(f"{len(stmts)} days written to {OUT}")
