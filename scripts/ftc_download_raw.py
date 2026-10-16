"""Copy the raw FTC files from R2 to a local directory, verifying checksums.

    CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... \
      python3 -I scripts/ftc_download_raw.py OUT_DIR

Lists r2://canadial-data/ftc/raw/ and downloads every file not already
present locally with the right sha256 (stored in each object's metadata by
/api/admin/ftc/fetch). Feeds scripts/ftc_aggregate.py.
"""
import concurrent.futures as cf
import hashlib
import json
import os
import sys
import urllib.parse
import urllib.request

OUT = sys.argv[1]
TOKEN = os.environ["CLOUDFLARE_API_TOKEN"]
ACCOUNT = os.environ["CLOUDFLARE_ACCOUNT_ID"]
BASE = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT}/r2/buckets/canadial-data/objects"
os.makedirs(OUT, exist_ok=True)


def api(url):
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {TOKEN}"})
    return urllib.request.urlopen(req, timeout=120)


def list_keys():
    keys, cursor = [], None
    while True:
        q = {"prefix": "ftc/raw/", "per_page": 1000}
        if cursor:
            q["cursor"] = cursor
        d = json.load(api(f"{BASE}?{urllib.parse.urlencode(q)}"))
        keys += [(o["key"], o.get("custom_metadata", {}).get("sha256")) for o in d["result"]]
        cursor = (d.get("result_info") or {}).get("cursor")
        if not cursor or not (d.get("result_info") or {}).get("is_truncated"):
            return keys


def get(item):
    key, want = item
    path = os.path.join(OUT, key.rsplit("/", 1)[1])
    if os.path.exists(path) and want and hashlib.sha256(open(path, "rb").read()).hexdigest() == want:
        return key, "cached"
    data = api(f"{BASE}/{urllib.parse.quote(key)}").read()
    got = hashlib.sha256(data).hexdigest()
    if want and got != want:
        return key, f"CHECKSUM MISMATCH {got} != {want}"
    with open(path, "wb") as f:
        f.write(data)
    return key, "ok"


keys = list_keys()
print(f"{len(keys)} objects under ftc/raw/")
bad = 0
with cf.ThreadPoolExecutor(8) as ex:
    for key, status in ex.map(get, keys):
        if status not in ("ok", "cached"):
            bad += 1
            print(key, status)
print("done", "with errors" if bad else "all verified")
sys.exit(1 if bad else 0)
