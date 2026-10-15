"""Turn the Supabase export into SQL files for `wrangler d1 execute --file`.

One-off, run once when moving to D1. The export (2026-10-15, through the
Supabase Management API while the project was restricted) is kept in
r2://canadial-data/exports/supabase-2026-10-15/ with SHA256SUMS.

    python3 -I scripts/d1/load_supabase_export.py EXPORT_DIR OUT_DIR

Writes OUT_DIR/01_organizations.sql, 02_api_keys.sql, 03_reports_NNN.sql.
After loading them, run sql/refresh.sql to build numbers and the rollups.

Conversions, all chosen so pages render exactly as they did on Supabase:
  * phone_number text -> INTEGER. 220 junk rows (leading 0 or 1) load too;
    every page 404s them, but they counted toward the homepage totals.
  * created_at "2026-06-15 01:19:14.123456" (Management API) -> the
    "2026-06-15T01:19:14.123456" form PostgREST returned and the pages parse.
    No timezone suffix, same as before (the columns are timestamp without
    time zone, read as UTC).
  * booleans -> 0/1.
"""
import json
import os
import sys

EXPORT, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
CHUNK = 200  # rows per INSERT; keeps each statement well under D1's 100 KB limit
STATEMENTS_PER_FILE = 500


def sql(v):
    if v is None:
        return "NULL"
    if isinstance(v, bool):
        return "1" if v else "0"
    if isinstance(v, (int, float)):
        return str(v)
    return "'" + str(v).replace("'", "''") + "'"


def ts(v):
    return v.replace(" ", "T", 1) if isinstance(v, str) else v


def write_inserts(prefix, table, cols, rows):
    files, stmts = [], []
    for i in range(0, len(rows), CHUNK):
        vals = ",".join("(" + ",".join(sql(x) for x in r) + ")" for r in rows[i:i + CHUNK])
        stmts.append(f"INSERT INTO {table} ({','.join(cols)}) VALUES {vals};")
    for j in range(0, len(stmts), STATEMENTS_PER_FILE):
        name = f"{prefix}_{j // STATEMENTS_PER_FILE:03d}.sql" if len(stmts) > STATEMENTS_PER_FILE else f"{prefix}.sql"
        with open(os.path.join(OUT, name), "w") as f:
            f.write("\n".join(stmts[j:j + STATEMENTS_PER_FILE]) + "\n")
        files.append(name)
    return files


orgs = json.load(open(os.path.join(EXPORT, "organizations.json")))
write_inserts("01_organizations", "organizations",
              ["id", "phone", "name", "department", "category", "hours", "tip", "slug", "created_at"],
              [(o["id"], int(o["phone_number"]), o["name"], o["department"], o["category"],
                o["hours"], o["tip"], o["slug"], ts(o["created_at"])) for o in orgs])

keys = json.load(open(os.path.join(EXPORT, "api_keys.json")))
write_inserts("02_api_keys", "api_keys",
              ["id", "key", "name", "email", "tier", "monthly_limit", "usage_count",
               "usage_reset_at", "created_at", "is_active"],
              [(k["id"], k["key"], k["name"], k["email"], k["tier"], k["monthly_limit"],
                k["usage_count"], ts(k["usage_reset_at"]), ts(k["created_at"]), k["is_active"])
               for k in keys])

reports = []
for name in ("spam_reports_non_ftc.jsonl", "spam_reports_ftc.jsonl"):
    with open(os.path.join(EXPORT, name)) as f:
        for line in f:
            r = json.loads(line)
            reports.append((r["id"], int(r["phone_number"]), r["is_spam"], r["type"], r["comment"],
                            r["source"], r["ip_hash"], ts(r["created_at"]), r["hidden"],
                            r["spam_score"], r["dedupe_key"]))
files = write_inserts("03_reports", "reports",
                      ["id", "phone", "is_spam", "type", "comment", "source", "ip_hash",
                       "created_at", "hidden", "spam_score", "dedupe_key"], reports)

print(json.dumps({"organizations": len(orgs), "api_keys": len(keys), "reports": len(reports),
                  "report_files": len(files)}))
