"""Aggregate raw FTC daily CSVs into per-number rows for D1.

    python3 -I scripts/ftc_aggregate.py RAW_DIR OUT_DIR

RAW_DIR holds DNC_Complaint_Numbers_YYYY-MM-DD.csv files (copied from
r2://canadial-data/ftc/raw/). Writes OUT_DIR/stats.json and SQL files for
`wrangler d1 execute --file`: ftc_subject_names, ftc_monthly, ftc_states,
ftc_subjects, and the ftc_* columns of numbers (upserted, so community
counters on existing rows are untouched). 60_detail_*.sql holds the
breakdown columns alone (ftc_hours, ftc_wdays, ftc_cities, ftc_local), so
they can be loaded onto existing rows without touching anything else.

Definitions — the same rules src/lib/ftc-ingest.ts applies to each new day:
  * A complaint is one CSV row. An identical row (all eight fields) already
    seen in the same file or in any of the previous DEDUPE_FILES stored files
    is the same complaint republished, and counts once. (The FTC republishes
    some rows in the next day's file; measured over the full archive, almost
    all duplicates are in the next file — see duplicate_rows_* in stats.)
  * Phone: digits only; 11 digits with a leading 1 drop the 1; must then be
    10 digits with an area code starting 2-9. Anything else is counted as
    invalid and skipped.
  * Dates are "YYYY-MM-DD hh:mm:ss" or, in some files, "M/D/YYYY h:mm".
  * Date: the call date (Violation_Date) when it parses and falls within the
    365 days up to the file's own date; otherwise the complaint's
    Created_Date. Months and first/last seen use it.
  * State: Consumer_State trimmed; empty is not counted.
  * Subject: Subject trimmed; empty becomes "(not given)".
  * Robocall: Recorded_Message_Or_Robocall == "Y".
  * Hour: the hh of Violation_Date's time, only when Violation_Date is the
    complaint's date (not the Created_Date fallback) and the time is neither
    exactly 00:00 nor 12:00 (form defaults). Weekday (0 = Sunday): of the
    date, only when it is Violation_Date.
  * Local: Consumer_Area_Code (digits) equals the number's area code.
  * City: city() below; counted with the state's abbreviation. A number keeps
    its 10 commonest cities: each day's counts are cut to their top 10, added
    to the stored ones, and the sum cut to 10 again (count desc, then name),
    exactly as the daily ingest does.
"""
import csv
import hashlib
import io
import json
import os
import re
import sys
from collections import Counter, defaultdict, deque
from datetime import date, timedelta

RAW, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
HEADER = ["Company_Phone_Number", "Created_Date", "Violation_Date", "Consumer_City",
          "Consumer_State", "Consumer_Area_Code", "Subject", "Recorded_Message_Or_Robocall"]
NO_SUBJECT = "(not given)"
DEDUPE_FILES = 7
DEDUPE_SEARCH_DAYS = 21  # the daily ingest looks this far back for those files
MAX_CALL_AGE_DAYS = 365
ISO = re.compile(r"^(\d{4})-(\d{2})-(\d{2})")
US = re.compile(r"^(\d{1,2})/(\d{1,2})/(\d{4})")
TIME = re.compile(r"^[^ ]+ ([0-9]{1,2}):([0-9]{2})")
TOP_CITIES = 10
STATES = {"Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR", "California": "CA", "Colorado": "CO",
          "Connecticut": "CT", "Delaware": "DE", "District of Columbia": "DC", "Florida": "FL", "Georgia": "GA",
          "Hawaii": "HI", "Idaho": "ID", "Illinois": "IL", "Indiana": "IN", "Iowa": "IA", "Kansas": "KS",
          "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD", "Massachusetts": "MA",
          "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS", "Missouri": "MO", "Montana": "MT",
          "Nebraska": "NE", "Nevada": "NV", "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM",
          "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH", "Oklahoma": "OK",
          "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC", "South Dakota": "SD",
          "Tennessee": "TN", "Texas": "TX", "Utah": "UT", "Vermont": "VT", "Virginia": "VA", "Washington": "WA",
          "West Virginia": "WV", "Wisconsin": "WI", "Wyoming": "WY", "Puerto Rico": "PR", "Guam": "GU",
          "Virgin Islands": "VI", "U.S. Virgin Islands": "VI", "American Samoa": "AS",
          "Northern Mariana Islands": "MP"}
STATE_WORDS = sorted({k.lower() for k in STATES} | {v.lower() for v in STATES.values()}, key=lambda w: (-len(w), w))
TRAILING_STATE = re.compile(r",? +(" + "|".join(re.escape(w) for w in STATE_WORDS) + r")$")
CITY_ALIAS = {"nyc": "new york", "new york city": "new york"}


def phone(raw):
    d = re.sub(r"\D", "", raw or "")
    if len(d) == 11 and d[0] == "1":
        d = d[1:]
    return int(d) if len(d) == 10 and d[0] in "23456789" else None


def yyyymmdd(s):
    s = s or ""
    m = ISO.match(s)
    if m:
        y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
    else:
        m = US.match(s)
        if not m:
            return None
        mo, d, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
    if not (1 <= mo <= 12 and 1 <= d <= 31 and 2000 <= y <= 2099):
        return None
    return y * 10000 + mo * 100 + d


def city(raw, state):
    """Consumer_City as "City|ST", or None. Free text: lower-cased, ZIP and
    trailing state dropped, anything that isn't letters/space/.'- rejected."""
    st = STATES.get(state.strip())
    if not st:
        return None
    c = re.sub(r"[ \t\r\n]+", " ", raw).strip(" ,.;-").lower()
    c = re.sub(r"[ ,]+[0-9]{5}(-[0-9]{4})?$", "", c)
    c = TRAILING_STATE.sub("", c).strip(" ,.;-")
    c = CITY_ALIAS.get(c, c)
    if len(c) < 3 or re.search(r"[^a-z .'-]", c) or c in STATE_WORDS:
        return None
    c = re.sub(r"(^|[ .'-])([a-z])", lambda m: m.group(1) + m.group(2).upper(), c)
    c = re.sub(r"\bMc([a-z])", lambda m: "Mc" + m.group(1).upper(), c)
    return f"{c}|{st}"


def top(counts, k=TOP_CITIES):
    return dict(sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))[:k])


def weekday(day):
    """0 = Sunday; None for a date that doesn't exist (yyyymmdd() allows 31 in any month)."""
    try:
        return date(day // 10000, day // 100 % 100, day % 100).isoweekday() % 7
    except ValueError:
        return None


files = sorted(f for f in os.listdir(RAW) if re.fullmatch(r"DNC_Complaint_Numbers_\d{4}-\d{2}-\d{2}\.csv", f))
# 64-bit hashes of every complaint row kept (ints keep ~20M of them in about
# 1 GB; a collision at that size is ~1e-5 likely and would drop one row).
seen = set()
stats = Counter()
recent = deque(maxlen=DEDUPE_FILES)   # (file date, hash set) of the previous stored files
total = defaultdict(int); robo = defaultdict(int)
first = {}; last = {}
monthly = defaultdict(int); states = defaultdict(int); subjects = defaultdict(int)
subject_ids = {}
hours = defaultdict(dict); wdays = defaultdict(dict); local = defaultdict(int); cities = {}
ingest_log = []      # one row per file: what the daily job's ftc_ingest_log holds

for f in files:
    file_day = int(f[22:32].replace("-", ""))
    oldest_call = int((date.fromisoformat(f[22:32]) - timedelta(days=MAX_CALL_AGE_DAYS)).strftime("%Y%m%d"))
    window_start = date.fromisoformat(f[22:32]) - timedelta(days=DEDUPE_SEARCH_DAYS)
    window = [h for d, h in recent if d >= window_start]
    with open(os.path.join(RAW, f), newline="", encoding="utf-8", errors="replace") as fh:
        reader = csv.reader(fh)
        header = next(reader, None)
        if header != HEADER:
            stats["bad_header_files"] += 1
            continue
        stats["files"] += 1
        this_file = set()
        day_cities = defaultdict(lambda: defaultdict(int))
        file_rows = file_valid = 0
        for row in reader:
            file_rows += 1
            stats["rows"] += 1
            if len(row) != 8:
                stats["malformed_rows"] += 1
                continue
            digest = int.from_bytes(hashlib.blake2b("\x1f".join(row).encode(), digest_size=8).digest(), "big")
            # The window holds every row of the previous files, duplicates
            # included, exactly as the daily ingest reads them back from R2.
            in_file = digest in this_file
            this_file.add(digest)
            if in_file or any(digest in w for w in window):
                stats["duplicate_rows"] += 1
                if in_file:
                    stats["duplicate_rows_same_file"] += 1
                elif window and digest in window[-1]:
                    stats["duplicate_rows_previous_file"] += 1
                continue
            if digest in seen:
                # identical to a row further back than the window: kept,
                # counted here so the choice of window is measured
                stats["repeats_beyond_window"] += 1
            seen.add(digest)
            p = phone(row[0])
            if p is None:
                stats["invalid_phone_rows"] += 1
                continue
            day = yyyymmdd(row[2])
            by_call = True
            if day is None or day > file_day or day < oldest_call:
                by_call = False
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
            if by_call:
                w = weekday(day)
                if w is not None:
                    wdays[p][str(w)] = wdays[p].get(str(w), 0) + 1
                t = TIME.match(row[2])
                if t:
                    hh, mm = int(t.group(1)), int(t.group(2))
                    if hh < 24 and (hh, mm) not in ((0, 0), (12, 0)):
                        hours[p][str(hh)] = hours[p].get(str(hh), 0) + 1
            ac = row[5].strip()
            if re.fullmatch(r"[0-9]+", ac) and int(ac) == p // 10_000_000:
                local[p] += 1
            c = city(row[3], row[4])
            if c:
                day_cities[p][c] += 1
        for p, counts in day_cities.items():
            merged = dict(cities.get(p, {}))
            for c, n in top(counts).items():
                merged[c] = merged.get(c, 0) + n
            cities[p] = top(merged)
        recent.append((date.fromisoformat(f[22:32]), this_file))
    with open(os.path.join(RAW, f), "rb") as fh:
        sha = hashlib.sha256(fh.read()).hexdigest()
    day_iso = f[22:32]
    ingest_log.append((day_iso, file_rows, file_valid, sha, f"ftc/raw/{day_iso[:4]}/{f}", "backfill"))
    if stats["files"] % 100 == 0:
        print(f"{f}: {stats['complaints']:,} complaints, {len(total):,} numbers", flush=True)


def sql(v):
    return "NULL" if v is None else (str(v) if isinstance(v, int) else "'" + str(v).replace("'", "''") + "'")


def js(d):
    return json.dumps(d, separators=(",", ":"), sort_keys=True) if d else None


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
    "detail": write("60_detail", "numbers", ["phone", "ftc_hours", "ftc_wdays", "ftc_cities", "ftc_local"],
                    ((p, js(hours.get(p)), js(wdays.get(p)), js(cities.get(p)), local.get(p, 0)) for p in sorted(total)),
                    conflict=" ON CONFLICT (phone) DO UPDATE SET ftc_hours = excluded.ftc_hours, ftc_wdays = excluded.ftc_wdays, ftc_cities = excluded.ftc_cities, ftc_local = excluded.ftc_local"),
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
    "detail": {"with_hours": len(hours), "with_wdays": len(wdays), "with_cities": len(cities),
               "with_local": len(local), "local_complaints": sum(local.values())},
    "sql_files": files_written,
}
json.dump(out, open(os.path.join(OUT, "stats.json"), "w"), indent=1)
print(json.dumps(out, indent=1))
