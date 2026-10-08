/**
 * CI entrypoint for `packages/apps`'s reload workflow — invoked by
 * `.github/workflows/reload-apps.yml` on every push to `main`.
 *
 * Job: mint an ops JWT, then refresh-or-import every app in `w6w-pack.json` against the
 * production w6w API. Nothing else — no operator login, no frontend-redeploy trigger. That's a
 * separate concern; this script's only job is publishing the app catalog via the `/system-ops`
 * ops-JWT edge. It does REPORT how many entries actually changed the catalog (`changed=<n>` on
 * `$GITHUB_OUTPUT`), so the workflow can skip the ~4-minute site rebuild when the answer is 0.
 *
 * Plain Node, zero deps: `fetch` and `node:crypto` are both built in, so there's nothing to
 * `npm install` before this can run.
 *
 * Required env: `W6W_API_URL`, `OPS_JWT_SECRET`.
 * Usage: `node .github/scripts/reload-apps.js`
 */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const API_URL = process.env.W6W_API_URL;
const SECRET = process.env.OPS_JWT_SECRET;

if (!API_URL || !SECRET) {
  console.error(
    `reload-apps: missing required env var(s): ${[
      !API_URL && "W6W_API_URL",
      !SECRET && "OPS_JWT_SECRET",
    ].filter(Boolean).join(", ")}`,
  );
  process.exit(1);
}

const OPS_AUDIENCE = "w6w:system-ops";
const APPS_RELOAD_SCOPE = "apps:reload";
const TOKEN_TTL_SECONDS = 120;

const b64url = (input) =>
  Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/** Minted fresh, per request — never held for the whole run. */
function mintToken(scope) {
  const iat = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const payload = { aud: OPS_AUDIENCE, scope, iat, exp: iat + TOKEN_TTL_SECONDS };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const signature = b64url(crypto.createHmac("sha256", SECRET).update(signingInput).digest());
  return `${signingInput}.${signature}`;
}

const PACK_PATH = path.join(__dirname, "..", "..", "w6w-pack.json");

/** How many times to attempt a request that failed for a reason that may not recur. */
const MAX_ATTEMPTS = 2;
const RETRY_BASE_MS = 1000;

/**
 * Per-attempt ceiling. A healthy refresh answers in ~0.1 s (p99 1.5 s), and the one cold
 * warm-up that downloads the repo tarball in ~33 s (measured 2026-10-06). Without a ceiling a
 * request that never answers holds its worker for as long as the load balancer lets it.
 */
const REQUEST_TIMEOUT_MS = 90_000;

/**
 * Stop the run after this many CONSECUTIVE entries fail for a reason that says the API itself
 * is unwell (5xx, timeout, dropped connection, GitHub rate limit) rather than that one app is
 * wrong. On 2026-10-06 the API's instances were OOM-killed for an hour and this script ground
 * through every remaining entry at ~3 minutes each — a 64-minute run that was never going to
 * pass. Two full rounds of the worker pool is enough evidence; the rest are reported as skipped
 * so the failure is visible in minutes, and `workflow_dispatch` is the retry.
 */
const SYSTEMIC_FAILURE_LIMIT = 16;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * `fetch`, retried on 5xx and on network-level throws. `makeInit` is called per attempt so each
 * attempt carries a FRESH ops token: the token lives 120 s, and a retry that reused the first
 * attempt's token after a slow 5xx landed as `401 Invalid or expired token` (2026-10-06).
 *
 * A 4xx is the server's considered answer — a bad ref, a version conflict, an unknown app — and
 * repeating it just wastes the run. A 5xx or a dropped connection is the server having a moment,
 * and on 2026-08-03 exactly one of those (a bare `503 {}` on postmark) failed a run in which the
 * other 114 apps were fine, which in turn suppressed the frontend deploy for the whole batch.
 * The catalog write is idempotent, so re-attempting is safe.
 */
async function fetchWithRetry(url, makeInit) {
  let lastErr;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, { ...makeInit(), signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
      if (res.status < 500 || attempt === MAX_ATTEMPTS) return res;
      lastErr = `${res.status}`;
    } catch (err) {
      if (attempt === MAX_ATTEMPTS) throw err;
      lastErr = err.message;
    }
    await sleep(RETRY_BASE_MS * attempt);
  }
  throw new Error(lastErr);
}

/**
 * How many entries process concurrently once the tarball cache is warm. The API's
 * IP rate limiter defaults to a 120 burst / 20-per-sec refill (`app.ts`'s `apiRate`)
 * — comfortably above this.
 */
const CONCURRENCY = 8;

/**
 * `force` controls BOTH the refresh body's `force` and the import fallback's
 * `refresh` — both ultimately reach the same `resolveSource(sourceRef, { force })`
 * (`registry.ts`'s `refresh()` / `importApp`'s pre-warm). See `main()`'s header
 * comment for why this must be `true` for only the very first entry of a run.
 */
async function refreshOrImport(relPath, force) {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "..", relPath, "package.json"), "utf8"),
  );
  const id = pkg.w6w.id;
  const name = relPath.split("/").pop();

  // A network-level throw (timeout, DNS blip, reset) must fail this ONE entry, never take down
  // the whole run — the loop in main() has 100 more entries to get through either way.
  try {
    const refreshRes = await fetchWithRetry(`${API_URL}/system-ops/apps/${id}/refresh`, () => ({
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${mintToken(APPS_RELOAD_SCOPE)}` },
      body: JSON.stringify({ force }),
    }));
    if (refreshRes.ok) {
      // `registered` = a new version row was written; `latestAdvanced` = the catalog's latest
      // pointer moved. Either one is a change the site's app pages can show.
      const body = await refreshRes.json().catch(() => ({}));
      const changed = body?.registered === true || body?.latestAdvanced === true;
      return { id, name, ok: true, changed, detail: changed ? "refreshed (changed)" : "refreshed" };
    }

    const refreshBody = await refreshRes.json().catch(() => ({}));
    if (refreshRes.status !== 404 || refreshBody?.error?.code !== "unknown_app") {
      return {
        id,
        name,
        ok: false,
        systemic: isSystemic(refreshRes.status, refreshBody),
        detail: `refresh ${refreshRes.status} ${JSON.stringify(refreshBody)}`,
      };
    }

    const importRes = await fetchWithRetry(`${API_URL}/system-ops/apps/import`, () => ({
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${mintToken(APPS_RELOAD_SCOPE)}` },
      body: JSON.stringify({ source: `github:w6w-io/w6w-apps@main#${relPath}`, refresh: force }),
    }));
    if (importRes.ok) {
      return { id, name, ok: true, changed: true, detail: "imported" };
    }
    const importBody = await importRes.json().catch(() => ({}));
    return {
      id,
      name,
      ok: false,
      systemic: isSystemic(importRes.status, importBody),
      detail: `import ${importRes.status} ${JSON.stringify(importBody)}`,
    };
  } catch (err) {
    return { id, name, ok: false, systemic: true, detail: `network error: ${err.message}` };
  }
}

/**
 * A failure that says nothing about the app and everything about the API (or its GitHub
 * access): a 5xx that survived the retry, or GitHub refusing the ref lookup for rate reasons
 * (anonymous 60/h, ISS-024) — the next entry will hit the same wall.
 */
function isSystemic(status, body) {
  if (status >= 500) return true;
  const msg = body?.error?.message ?? "";
  return body?.error?.code === "fetch_failed" && /\((403|429)\)/.test(msg);
}

async function main() {
  const pack = JSON.parse(fs.readFileSync(PACK_PATH, "utf8"));
  const entries = pack.apps.map((a) => a.path.replace(/^\.\//, "").replace(/\/+$/, ""));

  if (entries.length === 0) {
    console.log("reload-apps: no entries in w6w-pack.json");
    process.exit(0);
  }

  let failed = 0;
  let changed = 0;
  let consecutiveSystemic = 0;
  let aborted = false;
  function report(result) {
    const status = result.ok ? "OK  " : "FAIL";
    console.log(`  ${status}  ${result.id.padEnd(28)} ${result.name.padEnd(20)} ${result.detail}`);
    if (!result.ok) failed++;
    if (result.changed) changed++;
    consecutiveSystemic = result.systemic ? consecutiveSystemic + 1 : 0;
    if (consecutiveSystemic >= SYSTEMIC_FAILURE_LIMIT && !aborted) {
      aborted = true;
      console.log(
        `\nreload-apps: ${consecutiveSystemic} consecutive API-side failures - the API is unhealthy, ` +
          "not the apps. Stopping; re-run with workflow_dispatch once it recovers.\n",
      );
    }
  }

  // Every entry resolves `github:w6w-io/w6w-apps@main#<path>` — same repo, same ref,
  // only the subpath fragment differs, and that's applied AFTER extraction
  // (`applySubpath`), not part of the tarball cache key. So the whole pack shares ONE
  // cached extraction of the repo. Forcing a refresh (`force: true`) on every entry —
  // as this script used to — deletes and re-downloads+re-extracts that shared ~80MB
  // repo tarball once per entry: 265 apps meant 265 full repo fetches, serially, which
  // is what pushed a run past an hour (root-caused 2026-08-25).
  //
  // The fix: force exactly ONE entry, run it alone and awaited (never inside the
  // concurrent pool below — a concurrent force:true would rm -rf the cache dir while
  // others are mid-read of it), then let every other entry ride the now-warm cache
  // with force:false. force:false is always safe even if the warm-up entry fails: the
  // resolver only skips its fetch on a cache HIT, so a cold/missing cache still fetches
  // normally, just without redundantly wiping it first.
  const [warmupPath, ...restPaths] = entries;
  report(await refreshOrImport(warmupPath, true));

  let cursor = 0;
  async function worker() {
    while (cursor < restPaths.length && !aborted) {
      const relPath = restPaths[cursor++];
      report(await refreshOrImport(relPath, false));
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, restPaths.length) }, worker),
  );

  const skipped = restPaths.length - cursor;
  console.log(
    `\nreload-apps: ${entries.length - skipped} entries processed, ${failed} failed, ` +
      `${changed} changed the catalog${skipped ? `, ${skipped} skipped (aborted)` : ""}`,
  );
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed}\n`);
  process.exit(failed > 0 || skipped > 0 ? 1 : 0);
}

main();
