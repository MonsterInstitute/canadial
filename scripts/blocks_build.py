"""Build number-block tables from the CNAC and NANPA assignment files.

    python3 -I scripts/blocks_build.py RAW_DIR AS_OF OUT_DIR

RAW_DIR holds the four files stored in r2://canadial-data/blocks/raw/<AS_OF>/:
  COCodeStatus_ALL.zip                          CNAC, every Canadian CO code
  CoCodeAssignment_Utilized_AllStates_Public.zip NANPA, every assigned US CO code
  ThousandsBlockAssignment_All_Augmented.zip     NANPA, every US thousands-block
  COBlockStatus_ALL.zip                         CNAC thousands-blocks (pooling
                                                 trials only; not used)

Writes OUT_DIR/*.sql that REPLACE number_blocks and number_blocks_x wholesale,
plus stats.json.

Sources and terms: CNAC publishes the CO code status nightly "to help the
public find where assigned codes are located"; NANPA publishes its assignment
records publicly. Neither states a licence; both are factual assignment
records. Pages attribute them by name and date.

What a block row means: the carrier the block was assigned to. With number
portability a number can since have moved to another carrier, so pages must
say "assigned to", never "this number's carrier".
"""
import csv
import io
import json
import os
import sys
import zipfile
from collections import Counter

RAW, AS_OF, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(OUT, exist_ok=True)
stats = Counter()


def members(name):
    z = zipfile.ZipFile(os.path.join(RAW, name))
    return [(n, z.read(n)) for n in z.namelist()]


# CNAC status -> our status. Only "In Service" codes belong to a carrier.
CA_STATUS = {"In Service": "assigned"}

blocks = {}  # npanxx -> row
(_, raw), = members("COCodeStatus_ALL.zip")
rows = list(csv.reader(io.StringIO(raw.decode("utf-8", "replace"))))
for r in rows[2:]:  # header, then a row holding only the file date
    if len(r) < 8 or not r[0].strip().isdigit() or not r[1].strip().isdigit():
        stats["ca_skipped"] += 1
        continue
    npanxx = int(r[0]) * 1000 + int(r[1])
    status = CA_STATUS.get(r[2].strip(), "unassigned")
    blocks[npanxx] = ("CA", r[5].strip() or None, r[4].strip() or None,
                      (r[6].strip() or None) if status == "assigned" else None,
                      (r[7].strip() or None) if status == "assigned" else None,
                      status, 1 if r[3].strip() == "Y" else 0, "CNAC")
    stats[f"ca_{status}"] += 1

(_, raw), = members("CoCodeAssignment_Utilized_AllStates_Public.zip")
reader = csv.reader(io.StringIO(raw.decode("latin-1")), delimiter="\t")
hdr = [h.strip() for h in next(reader)]
i = {h: hdr.index(h) for h in hdr}
for r in reader:
    r = [c.strip() for c in r]
    if len(r) < len(hdr) - 1 or "-" not in r[i["NPA-NXX"]]:
        stats["us_skipped"] += 1
        continue
    npa, nxx = r[i["NPA-NXX"]].split("-")
    npanxx = int(npa) * 1000 + int(nxx)
    if npanxx in blocks:  # an NPA in both files would be a data error
        stats["us_conflicts_with_ca"] += 1
        continue
    blocks[npanxx] = ("US", r[i["State"]] or None, r[i["RateCenter"]] or None,
                      r[i["Company"]].strip('"') or None, r[i["OCN"]] or None,
                      "assigned", 1 if r[i["Pooled Code"]] == "Y" else 0, "NANPA")
    stats["us_assigned"] += 1

xblocks = []
(_, raw), = members("ThousandsBlockAssignment_All_Augmented.zip")
for r in csv.DictReader(io.StringIO(raw.decode("latin-1"))):
    try:
        npanxx = int(r["NPA"]) * 1000 + int(r["NXX"])
        x = int(r["X"])
    except ValueError:
        stats["xb_skipped"] += 1
        continue
    parent = blocks.get(npanxx)
    st = r["STATUS"].strip()
    if st in ("AS", "RT"):
        ocn = (r["OCN"] or "").strip() or None
        if parent and ocn == parent[4]:
            stats["xb_same_as_code"] += 1
            continue
        xblocks.append((npanxx * 10 + x, "assigned", (r["Assigned To"] or "").strip() or None, ocn))
        stats["xb_assigned_other_carrier"] += 1
    else:  # AV, AP, AF: in the pool, not assigned to anyone
        xblocks.append((npanxx * 10 + x, "available", None, None))
        stats["xb_available"] += 1


def sql(v):
    return "NULL" if v is None else (str(v) if isinstance(v, int) else "'" + str(v).replace("'", "''") + "'")


def write(prefix, table, cols, rows, chunk=300, per_file=500):
    stmts, files = [], 0
    for k in range(0, len(rows), chunk):
        vals = ",".join("(" + ",".join(sql(v) for v in row) + ")" for row in rows[k:k + chunk])
        stmts.append(f"INSERT INTO {table} ({','.join(cols)}) VALUES {vals};")
    for k in range(0, len(stmts), per_file):
        with open(os.path.join(OUT, f"{prefix}_{k // per_file:04d}.sql"), "w") as f:
            f.write("\n".join(stmts[k:k + per_file]) + "\n")
        files += 1
    return files


with open(os.path.join(OUT, "00_clear.sql"), "w") as f:
    f.write("DELETE FROM number_blocks;\nDELETE FROM number_blocks_x;\n")
write("10_blocks", "number_blocks",
      ["npanxx", "country", "region", "rate_center", "carrier", "ocn", "status", "pooled", "source", "as_of"],
      [(k, *v, AS_OF) for k, v in sorted(blocks.items())])
write("20_blocks_x", "number_blocks_x", ["npanxxx", "status", "carrier", "ocn"], sorted(xblocks))
stats["number_blocks"] = len(blocks)
stats["number_blocks_x"] = len(xblocks)
json.dump(dict(stats), open(os.path.join(OUT, "stats.json"), "w"), indent=1)
print(json.dumps(dict(stats), indent=1))
