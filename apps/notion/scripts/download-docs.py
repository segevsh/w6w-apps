#!/usr/bin/env python3
"""Download Notion's full documentation index, linked pages, and published OpenAPI specs.

Usage: python3 scripts/download-docs.py /path/to/snapshot
Downloaded files are source material, separate from the runtime package.
"""

import argparse
import concurrent.futures
import hashlib
import json
import pathlib
import re
import time
import urllib.request

BASE = "https://developers.notion.com/"


def fetch(url):
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read(), response.url, response.headers.get("Content-Type", "")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("destination", type=pathlib.Path)
    root = parser.parse_args().destination
    root.mkdir(parents=True, exist_ok=True)
    index, _, _ = fetch(BASE + "llms.txt")
    (root / "llms.txt").write_bytes(index)
    urls = set(re.findall(r"https://developers\.notion\.com/[^)\s]+", index.decode()))
    urls.update(BASE + name for name in (
        "openapi.json", "openapi-adminApi.json", "openapi-undocumented.json"
    ))

    def download(url):
        relative = pathlib.PurePosixPath(url.removeprefix(BASE))
        if relative.is_absolute() or ".." in relative.parts:
            return {"url": url, "error": "Unexpected documentation path"}
        for attempt in range(4):
            try:
                data, final_url, content_type = fetch(url)
                path = root / relative
                # The API workspace index entry redirects to public Postman HTML.
                if "text/html" in content_type:
                    path = path.with_suffix(".html")
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(data)
                return {
                    "url": url,
                    "final_url": final_url,
                    "path": str(path.relative_to(root)),
                    "bytes": len(data),
                    "sha256": hashlib.sha256(data).hexdigest(),
                }
            except Exception as error:
                if attempt == 3:
                    return {"url": url, "error": str(error)}
                time.sleep(attempt + 1)

    with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
        results = list(pool.map(download, sorted(urls)))
    (root / "manifest.json").write_text(json.dumps(results, indent=2) + "\n")
    failures = [result for result in results if "error" in result]
    print(json.dumps({
        "downloaded": len(results) - len(failures),
        "failed": failures,
        "bytes": sum(result.get("bytes", 0) for result in results),
    }, indent=2))
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
