"""Aggregate raw FTC daily CSVs into per-number rows for D1.

    python3 -I scripts/ftc_aggregate.py RAW_DIR OUT_DIR

RAW_DIR holds DNC_Complaint_Numbers_YYYY-MM-DD.csv files (copied from
r2://canadial-data/ftc/raw/). Writes OUT_DIR/stats.json and SQL files for
`wrangler d1 execute --file`: ftc_subject_names, ftc_monthly, ftc_states,
ftc_subjects, and the ftc_* columns of numbers (upserted, so community
counters on existing rows are untouched).

Definitions — the same rules src/lib/ftc-ingest.ts applies to each new day:
  * A complaint is one CSV row. Identical rows (all eight fields) are one
    complaint, whichever file they appear in.
  * Phone: digits only; 11 digits with a leading 1 drop the 1; must then be
    10 digits with an area code starting 2-9. Anything else is counted as
    invalid and skipped.
  * Date: the call date (Violation_Date) when it parses and falls between
    2000-01-01 and the file's own date; otherwise the complaint's
    Created_Date. Months and first/last seen use it.
  * State: Consumer_State trimmed; empty is not counted.
  * Subject: Subject trimmed; empty becomes "(not given)".
  * Robocall: Recorded_Message_Or_Robocall == "Y".
"""
import csv
import hashlib
import io
import json
import os
import re
import sys
from collections import Counter, defaultdict

RAW, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
HEADER = ["Company_Phone_Number", "Created_Date", "Violation_Date", "Consumer_City",
          "Consumer_State", "Consumer_Area_Code", "Subject", "Recorded_Message_Or_Robocall"]
NO_SUBJECT = "(not given)"
DATE = re.compile(r"^(\d{4})-(\d{2})-(\d{2})")


def phone(raw):
    d = re.sub(r"\D", "", raw or "")
    if len(d) == 11 and d[0] == "1":
        d = d[1:]
    return int(d) if len(d) == 10 and d[0] in "23456789" else None


def yyyymmdd(s):
    m = DATE.match(s or "")
    if not m:
        return None
    v = int(m.group(1) + m.group(2) + m.group(3))
    return v if 20000101 <= v <= 20991231 else None


files = sorted(f for f in os.listdir(RAW) if re.fullmatch(r"DNC_Complaint_Numbers_\d{4}-\d{2}-\d{2}\.csv", f))
# 64-bit hashes of every complaint row kept (ints keep ~20M of them in about
# 1 GB; a collision at that size is ~1e-5 likely and would drop one row).
seen = set()
stats = Counter()
prev_file = set()     # hashes from the previous file, to see where duplicates come from
total = defaultdict(int); robo = defaultdict(int)
first = {}; last = {}
monthly = defaultdict(int); states = defaultdict(int); subjects = defaultdict(int)
subject_ids = {}
ingest_log = []      # one row per file: what the daily job's ftc_ingest_log holds

for f in files:
    file_day = int(f[22:32].replace("-", ""))
    with open(os.path.join(RAW, f), newline="", encoding="utf-8", errors="replace") as fh:
        reader = csv.reader(fh)
        header = next(reader, None)
        if header != HEADER:
            stats["bad_header_files"] += 1
            continue
        stats["files"] += 1
        this_file = set()
        file_rows = file_valid = 0
        for row in reader:
            file_rows += 1
            stats["rows"] += 1
            if len(row) != 8:
                stats["malformed_rows"] += 1
                continue
            digest = int.from_bytes(hashlib.blake2b("\x1f".join(row).encode(), digest_size=8).digest(), "big")
            if digest in seen:
                stats["duplicate_rows"] += 1
                if digest in this_file:
                    stats["duplicate_rows_same_file"] += 1
                elif digest in prev_file:
                    stats["duplicate_rows_previous_file"] += 1
                continue
            seen.add(digest)
            this_file.add(digest)
            p = phone(row[0])
            if p is None:
                stats["invalid_phone_rows"] += 1
                continue
            day = yyyymmdd(row[2])
            if day is None or day > file_day:
                day = yyyymmdd(row[1])
                if day is None:
                    stats["undated_rows"] += 1
                    continue
                stats["dated_by_created"] += 1
            stats["complaints"] += 1
            file_valid += 1
            total[p] += 1
            if row[7].strip().upper() == "Y":
                robo[p] += 1
            first[p] = day if p not in first or day < first[p] else first[p]
            last[p] = day if p not in last or day > last[p] else last[p]
            monthly[(p, day // 100)] += 1
            st = row[4].strip()
            if st:
                states[(p, st)] += 1
            sub = row[6].strip() or NO_SUBJECT
            sid = subject_ids.setdefault(sub, len(subject_ids) + 1)
            subjects[(p, sid)] += 1
        prev_file = this_file
    with open(os.path.join(RAW, f), "rb") as fh:
        sha = hashlib.sha256(fh.read()).hexdigest()
    day_iso = f[22:32]
    ingest_log.append((day_iso, file_rows, file_valid, sha, f"ftc/raw/{day_iso[:4]}/{f}", "backfill"))
    if stats["files"] % 100 == 0:
        print(f"{f}: {stats['complaints']:,} complaints, {len(total):,} numbers", flush=True)


def sql(v):
    return "NULL" if v is None else (str(v) if isinstance(v, int) else "'" + str(v).replace("'", "''") + "'")


def write(name, table, cols, rows, conflict=None, chunk=400, per_file=500):
    stmts, buf = [], []
    def flush():
        if buf:
            vals = ",".join("(" + ",".join(sql(x) for x in r) + ")" for r in buf)
            stmts.append(f"INSERT INTO {table} ({','.join(cols)}) VALUES {vals}{conflict or ''};")
            buf.clear()
    for r in rows:
        buf.append(r)
        if len(buf) >= chunk:
            flush()
    flush()
    n = 0
    for i in range(0, len(stmts), per_file):
        with open(os.path.join(OUT, f"{name}_{i // per_file:04d}.sql"), "w") as out:
            out.write("\n".join(stmts[i:i + per_file]) + "\n")
        n += 1
    return n


files_written = {
    "ingest_log": write("05_ingest_log", "ftc_ingest_log", ["day", "records", "valid", "sha256", "r2_key", "applied_at"], ingest_log),
    "subjects": write("10_subject_names", "ftc_subject_names", ["id", "name"],
                      sorted((i, s) for s, i in subject_ids.items())),
    "numbers": write("20_numbers", "numbers", ["phone", "ftc_total", "ftc_robocall", "ftc_first", "ftc_last"],
                     ((p, total[p], robo[p], first[p], last[p]) for p in sorted(total)),
                     conflict=" ON CONFLICT (phone) DO UPDATE SET ftc_total = excluded.ftc_total, ftc_robocall = excluded.ftc_robocall, ftc_first = excluded.ftc_first, ftc_last = excluded.ftc_last"),
    "monthly": write("30_monthly", "ftc_monthly", ["phone", "ym", "n"], ((p, ym, n) for (p, ym), n in sorted(monthly.items()))),
    "states": write("40_states", "ftc_states", ["phone", "state", "n"], ((p, s, n) for (p, s), n in sorted(states.items()))),
    "subjects_rows": write("50_subjects", "ftc_subjects", ["phone", "subject", "n"], ((p, s, n) for (p, s), n in sorted(subjects.items()))),
}

out = {
    **stats,
    "distinct_numbers": len(total),
    "table_rows": {"numbers": len(total), "ftc_monthly": len(monthly), "ftc_states": len(states),
             "ftc_subjects": len(subjects), "ftc_subject_names": len(subject_ids)},
    "date_range": [min(first.values()), max(last.values())] if first else None,
    "numbers_by_complaints": {
        "1": sum(1 for v in total.values() if v == 1),
        "2-9": sum(1 for v in total.values() if 2 <= v <= 9),
        "10-99": sum(1 for v in total.values() if 10 <= v <= 99),
        "100+": sum(1 for v in total.values() if v >= 100),
    },
    "max_complaints": max(total.values()) if total else 0,
    "sql_files": files_written,
}
json.dump(out, open(os.path.join(OUT, "stats.json"), "w"), indent=1)
print(json.dumps(out, indent=1))
