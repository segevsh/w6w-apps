/**
 * CI entrypoint for `packages/apps`'s publish workflow (`.github/workflows/reload-apps.yml`).
 *
 * The workflow has already built the pack (`app-build --pack w6w-pack.json -o dist`). This script:
 *   1. reads `dist/index.json` + every `dist/<id>/<version>/manifest.json`; aborts if the build
 *      reported `failures`;
 *   2. downloads the remote index `apps/index.json` from the blob bucket — the per-app
 *      `{version, digest, digestVersion, execSha256, mapSha256}` of the last successful publish.
 *      Absent (first run) or `--full` = no baseline;
 *   3. compares each built app against it: an app is CHANGED when it is missing there or its
 *      version, registry digest or exec sha-256 differ. Nothing changed ⇒ exit 0, no call;
 *   4. uploads, overwriting, for the changed apps only: each `app.js` to `apps/exec/<execSha256>.js`
 *      (asserting the file's own sha-256 first), each `app.js.map` to `apps/map/<sha>.js.map`, and
 *      the artifact index of just those apps `{ artifactIndexVersion: 1, artifacts: [manifest, ...] }`
 *      (also written to `dist/publish-index.json`) to `apps/index/<indexSha256>.json`. Every file of
 *      a changed app is written, even when its key already exists. GCS: JSON API, bounded
 *      concurrency, no process spawn per object. Local rehearsal (`--dry-run-local <dir>`): same
 *      keys under `<dir>/<key>` (the server's fs blob layout), via rename;
 *   5. notifies the server: ONE `POST $W6W_API_URL/system-ops/apps/publish-index {"indexSha256"}`
 *      with a fresh HS256 ops JWT (aud `w6w:system-ops`, scope `apps:publish`, 120 s TTL); the
 *      server verifies and registers the changed apps, so its catalog reloads them;
 *   6. rewrites the remote `apps/index.json` to the built set — AFTER the server accepted the
 *      publish, and keeping the previous entry for any app the server reported `failed`, so a
 *      failed or unreachable publish is retried by the next run instead of being recorded as done.
 *      The write is conditional on the generation downloaded in step 2 (412 = a concurrent run
 *      moved it; this run does not overwrite). Reading or writing the remote index is
 *      best-effort: a failure is a `::warning::` and the run sends every app (the server skips
 *      what it holds), never a failed publish;
 *   7. prints every failure and exits 1 on `failed > 0` / non-2xx; writes `changed=<n>` to
 *      `$GITHUB_OUTPUT` so the workflow can skip the site rebuild when nothing changed.
 *
 * `--full` ignores the remote index: every built app is sent, and the server still skips the
 * ones its catalog already holds. It is the recovery path when the catalog and `apps/index.json`
 * disagree (e.g. a restored database).
 *
 * Plain Node, zero deps (`fetch`, `node:crypto`, `node:fs`). Never logs the secret or a token.
 *
 * Env: `W6W_API_URL`, `OPS_JWT_SECRET` (always); for GCS: `W6W_BLOB_BUCKET` (default
 * `w6w-io-blobs`) and either `GCS_ACCESS_TOKEN` or a `gcloud` on PATH (authenticated by
 * `google-github-actions/auth`). The publisher identity needs to create, read and overwrite
 * objects under `apps/`.
 * Usage: `node .github/scripts/publish-apps.mjs [--dist dist] [--full] [--dry-run-local <blobdir>]`
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const OPS_AUDIENCE = "w6w:system-ops";
export const APPS_PUBLISH_SCOPE = "apps:publish";
export const TOKEN_TTL_SECONDS = 120;
export const DEFAULT_BUCKET = "w6w-io-blobs";
/** The remote index: what the last successful publish recorded, per app id. Overwritten each run. */
export const REMOTE_INDEX_KEY = "apps/index.json";
export const REMOTE_INDEX_VERSION = 1;
const SHA256_HEX = /^[0-9a-f]{64}$/;
const PUBLISH_TIMEOUT_MS = 10 * 60_000;
const UPLOAD_CONCURRENCY = 16;

export const sha256Hex = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

/** Mirrors `blobKeyExec` / `blobKeyMap` (core types `artifact.ts`) and the server's `blobKeyIndex`. */
function assertSha(sha) {
  if (typeof sha !== "string" || !SHA256_HEX.test(sha)) {
    throw new TypeError("sha256 must be 64 lowercase hex characters");
  }
}
export function blobKeyExec(sha) {
  assertSha(sha);
  return `apps/exec/${sha}.js`;
}
export function blobKeyMap(sha) {
  assertSha(sha);
  return `apps/map/${sha}.js.map`;
}
export function blobKeyIndex(sha) {
  assertSha(sha);
  return `apps/index/${sha}.json`;
}

const b64url = (input) =>
  Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/** HS256 ops JWT; minted fresh per request. `nowSeconds` is a test seam. */
export function mintToken(secret, scope = APPS_PUBLISH_SCOPE, nowSeconds) {
  if (!secret) throw new Error("mintToken: empty secret");
  const iat = nowSeconds ?? Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const payload = { aud: OPS_AUDIENCE, scope, iat, exp: iat + TOKEN_TTL_SECONDS };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const signature = b64url(crypto.createHmac("sha256", secret).update(signingInput).digest());
  return `${signingInput}.${signature}`;
}

/** The key an `app.js` with this sha must live at; throws unless `key` is exactly that. */
export function assertExecKey(key, execSha256) {
  const want = blobKeyExec(execSha256);
  if (key !== want) throw new Error(`exec key ${key} != ${want}`);
}

/**
 * Pure assembly. `index` is `dist/index.json` (`{apps, failures}`); `manifests` maps
 * `"<id>@<version>"` to the parsed `manifest.json`. Throws on any failure / mismatch.
 * Returns `{ artifacts, indexJson, indexSha256 }`; `indexSha256` hashes the exact `indexJson`.
 */
export function assembleIndex(index, manifests) {
  if (!index || !Array.isArray(index.apps)) throw new Error("dist/index.json has no `apps` array");
  const failures = index.failures ?? [];
  if (failures.length > 0) {
    const lines = failures.map((f) => `  ${f.path}: ${f.code}: ${f.message}`).join("\n");
    throw new Error(`build reported ${failures.length} failure(s):\n${lines}`);
  }
  const artifacts = [];
  for (const entry of index.apps) {
    const ref = `${entry.id}@${entry.version}`;
    const m = manifests[ref];
    if (!m) throw new Error(`${ref}: no manifest.json`);
    if (m.id !== entry.id || m.version !== entry.version) {
      throw new Error(`${ref}: manifest identifies as ${m.id}@${m.version}`);
    }
    if (m.exec?.sha256 !== entry.execSha256) {
      throw new Error(`${ref}: manifest exec.sha256 ${m.exec?.sha256} != index ${entry.execSha256}`);
    }
    artifacts.push(m);
  }
  return { artifacts, ...serializeIndex(artifacts) };
}

/** The artifact index body for `artifacts`; `indexSha256` hashes the exact `indexJson` bytes. */
export function serializeIndex(artifacts) {
  const indexJson = JSON.stringify({ artifactIndexVersion: 1, artifacts });
  return { indexJson, indexSha256: sha256Hex(Buffer.from(indexJson, "utf8")) };
}

/** The remote-index record of one built app: what decides whether it changed. */
export function remoteEntry(entry, manifest) {
  const e = {
    version: entry.version,
    digest: entry.digest,
    digestVersion: entry.digestVersion,
    execSha256: entry.execSha256,
  };
  if (manifest?.map?.sha256) e.mapSha256 = manifest.map.sha256;
  return e;
}

/**
 * Step 3: the indices (into `index.apps`) of the apps that differ from the remote index's
 * `apps` map (`null` = no baseline, so every app). Changed = missing, or version / digest /
 * exec sha-256 differ.
 */
export function diffApps(index, remoteApps) {
  const changed = [];
  index.apps.forEach((e, i) => {
    const r = remoteApps && Object.hasOwn(remoteApps, e.id) ? remoteApps[e.id] : undefined;
    if (!r || r.version !== e.version || r.digest !== e.digest || r.execSha256 !== e.execSha256) {
      changed.push(i);
    }
  });
  return changed;
}

/**
 * Step 6: the next remote index. Every built app is recorded at its built entry, except a
 * changed app the server did not accept — that keeps its previous remote entry (or stays out),
 * so the next run sends it again. A `failed` result without an id cannot be attributed, so then
 * no changed app is recorded as accepted.
 */
export function nextRemoteIndex({ index, artifacts, changed, previous, results, now, commit }) {
  const failed = new Set();
  let unattributed = false;
  for (const r of results ?? []) {
    if (r.outcome !== "failed") continue;
    if (r.id) failed.add(r.id);
    else unattributed = true;
  }
  const changedSet = new Set(changed);
  const apps = {};
  index.apps.forEach((e, i) => {
    const rejected = changedSet.has(i) && (unattributed || failed.has(e.id));
    if (!rejected) apps[e.id] = remoteEntry(e, artifacts[i]);
    else if (previous && Object.hasOwn(previous, e.id)) apps[e.id] = previous[e.id];
  });
  const doc = { remoteIndexVersion: REMOTE_INDEX_VERSION, updatedAt: now, apps };
  if (commit) doc.commit = commit;
  return doc;
}

/** Parse a downloaded remote index; anything unrecognisable is no baseline (`null`). */
export function parseRemoteIndex(bytes) {
  if (bytes == null) return null;
  try {
    const doc = JSON.parse(Buffer.from(bytes).toString("utf8"));
    if (doc?.remoteIndexVersion !== REMOTE_INDEX_VERSION || typeof doc.apps !== "object" || !doc.apps) {
      return null;
    }
    return doc;
  } catch {
    return null;
  }
}

/**
 * Plan the uploads: `[{ key, file?, bytes? }]`. Reads each `app.js`/`app.js.map` via `readFile`
 * (a seam) only to hash it: the file's own sha-256 must equal the manifest's before it is queued,
 * and its key is asserted to be `blobKeyExec`/`blobKeyMap`.
 */
export function planUploads(index, artifacts, { dist, readFile = fs.readFileSync } = {}) {
  const plan = [];
  index.apps.forEach((entry, i) => {
    const m = artifacts[i];
    const dir = path.join(dist, entry.id, entry.version);
    const ref = `${entry.id}@${entry.version}`;
    const file = path.join(dir, "app.js");
    const got = sha256Hex(readFile(file));
    if (got !== entry.execSha256) {
      throw new Error(`${ref}: app.js sha-256 ${got} != index execSha256 ${entry.execSha256}`);
    }
    const key = blobKeyExec(entry.execSha256);
    assertExecKey(key, entry.execSha256);
    plan.push({ key, file, ref });
    if (m.map) {
      const mapFile = path.join(dir, "app.js.map");
      const mgot = sha256Hex(readFile(mapFile));
      if (mgot !== m.map.sha256) {
        throw new Error(`${ref}: app.js.map sha-256 ${mgot} != manifest map.sha256 ${m.map.sha256}`);
      }
      plan.push({ key: blobKeyMap(m.map.sha256), file: mapFile, ref });
    }
  });
  return plan;
}

/**
 * Run `put(item)` over `items` with at most `concurrency` in flight. `put` resolves once the
 * object is written; a rejection is collected, not thrown mid-batch. Returns
 * `{ uploaded, errors: [{key, message}] }`.
 */
export async function uploadAll(items, put, concurrency = UPLOAD_CONCURRENCY) {
  const out = { uploaded: 0, errors: [] };
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const item = items[next++];
      try {
        await put(item);
        out.uploaded++;
      } catch (e) {
        out.errors.push({ key: item.key, message: e instanceof Error ? e.message : String(e) });
      }
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, worker));
  return out;
}

/** Put into a local blob dir (`<dir>/<key>`, the server's fs driver layout), overwriting. */
export function makeLocalPut(dir) {
  return async ({ key, file, bytes }) => {
    const final = path.join(dir, key);
    const tmpDir = path.join(dir, ".tmp");
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.mkdirSync(path.dirname(final), { recursive: true });
    const tmp = path.join(tmpDir, `put.${crypto.randomUUID()}`);
    fs.writeFileSync(tmp, bytes ?? fs.readFileSync(file));
    fs.renameSync(tmp, final);
  };
}

/** Put into GCS via the JSON API, overwriting any object already at `key`. */
export function makeGcsPut(bucket, accessToken, fetchImpl = fetch) {
  return async ({ key, file, bytes }) => {
    const url = `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucket)}/o` +
      `?uploadType=media&name=${encodeURIComponent(key)}`;
    const body = bytes ?? fs.readFileSync(file);
    for (let attempt = 1;; attempt++) {
      let res;
      try {
        res = await fetchImpl(url, {
          method: "POST",
          headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/octet-stream" },
          body,
          signal: AbortSignal.timeout(120_000),
        });
      } catch (e) {
        if (attempt < 3) continue;
        throw e;
      }
      if (res.ok) return;
      // 429/5xx are transient; GCS also answers 429 for >1 write/s to one object.
      if ((res.status === 429 || res.status >= 500) && attempt < 3) continue;
      throw new Error(`GCS ${res.status} for ${key}`);
    }
  };
}

/**
 * The remote index in a local blob dir. `generation` is the sha-256 of the bytes read ("0" =
 * absent); `write` refuses (throws) if the file no longer matches it.
 */
export function makeLocalRemoteIndex(dir) {
  const file = path.join(dir, REMOTE_INDEX_KEY);
  const current = () => (fs.existsSync(file) ? fs.readFileSync(file) : null);
  return {
    async read() {
      const bytes = current();
      return { bytes, generation: bytes ? sha256Hex(bytes) : "0" };
    },
    async write(json, generation) {
      const bytes = current();
      if ((bytes ? sha256Hex(bytes) : "0") !== generation) {
        throw new Error(`${REMOTE_INDEX_KEY} changed since it was read; not overwriting`);
      }
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const tmp = `${file}.${crypto.randomUUID()}`;
      fs.writeFileSync(tmp, json);
      fs.renameSync(tmp, file);
    },
  };
}

/**
 * The remote index in GCS. `read` returns the bytes and the object generation ("0" = absent);
 * `write` uploads with `ifGenerationMatch=<generation>`, so a concurrent writer is a 412 error
 * instead of a lost update.
 */
export function makeGcsRemoteIndex(bucket, accessToken, fetchImpl = fetch) {
  const auth = { authorization: `Bearer ${accessToken}` };
  const obj = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o/` +
    encodeURIComponent(REMOTE_INDEX_KEY);
  return {
    async read() {
      const meta = await fetchImpl(obj, { headers: auth, signal: AbortSignal.timeout(60_000) });
      if (meta.status === 404) return { bytes: null, generation: "0" };
      if (!meta.ok) throw new Error(`GCS ${meta.status} reading ${REMOTE_INDEX_KEY} metadata`);
      const { generation } = await meta.json();
      const res = await fetchImpl(`${obj}?alt=media&generation=${encodeURIComponent(generation)}`, {
        headers: auth,
        signal: AbortSignal.timeout(60_000),
      });
      if (!res.ok) throw new Error(`GCS ${res.status} reading ${REMOTE_INDEX_KEY}`);
      return { bytes: Buffer.from(await res.arrayBuffer()), generation: String(generation) };
    },
    async write(json, generation) {
      const url = `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucket)}/o` +
        `?uploadType=media&ifGenerationMatch=${encodeURIComponent(generation)}` +
        `&name=${encodeURIComponent(REMOTE_INDEX_KEY)}`;
      const res = await fetchImpl(url, {
        method: "POST",
        headers: { ...auth, "content-type": "application/json" },
        body: json,
        signal: AbortSignal.timeout(60_000),
      });
      if (res.status === 412) {
        throw new Error(`${REMOTE_INDEX_KEY} changed since it was read (412); not overwriting`);
      }
      if (!res.ok) throw new Error(`GCS ${res.status} writing ${REMOTE_INDEX_KEY}`);
    },
  };
}

/**
 * Turn the publish-index response into `{ ok, changed, lines }`. `status` is the HTTP status;
 * `body` the parsed JSON (or text). ok iff 2xx and `failed === 0`.
 */
export function summarizeResult(status, body) {
  const lines = [];
  if (status < 200 || status >= 300) {
    const err = body && typeof body === "object" ? body.error : undefined;
    lines.push(`publish-index failed: HTTP ${status}${err ? ` ${err.code}: ${err.message}` : ""}`);
    return { ok: false, changed: 0, lines };
  }
  const { total = 0, unchanged = 0, changed = 0, failed = 0, results = [] } = body ?? {};
  lines.push(`publish-index: total=${total} unchanged=${unchanged} changed=${changed} failed=${failed}`);
  for (const r of results) {
    if (r.outcome === "failed") {
      lines.push(`  FAILED ${r.id ?? "?"}@${r.version ?? "?"}: ${r.error?.code}: ${r.error?.message}`);
    }
  }
  return { ok: failed === 0, changed, lines };
}

/** ONE publish-index POST; a fresh token per attempt; retries 5xx / dropped connection once. */
export async function postPublishIndex({ apiUrl, secret, indexSha256, fetchImpl = fetch, timeoutMs = PUBLISH_TIMEOUT_MS }) {
  const url = `${apiUrl.replace(/\/+$/, "")}/system-ops/apps/publish-index`;
  let last;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetchImpl(url, {
        method: "POST",
        headers: {
          authorization: `Bearer ${mintToken(secret)}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ indexSha256 }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      const text = await res.text();
      let body;
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
      if (res.status >= 500 && attempt < 2) {
        last = res.status;
        continue;
      }
      return { status: res.status, body };
    } catch (e) {
      if (e?.name === "TimeoutError" || attempt >= 2) throw e;
      last = e;
    }
  }
  throw new Error(`publish-index: ${last}`);
}

/** A GitHub Actions warning annotation (plain text elsewhere). */
function warn(message) {
  console.warn(`::warning title=publish-apps::${message}`);
}

function readDist(dist) {
  const index = JSON.parse(fs.readFileSync(path.join(dist, "index.json"), "utf8"));
  const manifests = {};
  for (const e of index.apps ?? []) {
    const p = path.join(dist, e.id, e.version, "manifest.json");
    if (fs.existsSync(p)) manifests[`${e.id}@${e.version}`] = JSON.parse(fs.readFileSync(p, "utf8"));
  }
  return { index, manifests };
}

function parseArgs(argv) {
  const o = { dist: "dist", localDir: undefined, full: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--dist") o.dist = argv[++i];
    else if (argv[i] === "--full") o.full = true;
    else if (argv[i] === "--dry-run-local") o.localDir = argv[++i];
    else throw new Error(`unknown argument: ${argv[i]}`);
  }
  if (!o.dist || (argv.includes("--dry-run-local") && !o.localDir)) throw new Error("missing argument value");
  return o;
}

export async function main(argv = process.argv.slice(2), env = process.env) {
  const args = parseArgs(argv);
  const localDir = args.localDir ?? env.W6W_BLOB_FS_DIR;
  const missing = ["W6W_API_URL", "OPS_JWT_SECRET"].filter((k) => !env[k]);
  if (missing.length) throw new Error(`missing required env var(s): ${missing.join(", ")}`);
  const output = (changed) => env.GITHUB_OUTPUT && fs.appendFileSync(env.GITHUB_OUTPUT, `changed=${changed}\n`);

  // 1. the build
  const { index, manifests } = readDist(args.dist);
  const { artifacts } = assembleIndex(index, manifests);
  console.log(`publish-apps: ${artifacts.length} app(s) built`);

  let put, remote;
  if (localDir) {
    put = makeLocalPut(localDir);
    remote = makeLocalRemoteIndex(localDir);
    console.log(`publish-apps: local blob dir ${localDir}`);
  } else {
    const token = env.GCS_ACCESS_TOKEN ||
      execFileSync("gcloud", ["auth", "print-access-token"], { encoding: "utf8" }).trim();
    const bucket = env.W6W_BLOB_BUCKET || DEFAULT_BUCKET;
    put = makeGcsPut(bucket, token);
    remote = makeGcsRemoteIndex(bucket, token);
  }

  // 2. the last published index. Unreadable is no baseline, not a failure: every app is sent
  // and the server still skips the ones its catalog holds.
  let bytes = null, generation = null;
  try {
    ({ bytes, generation } = await remote.read());
  } catch (e) {
    warn(`cannot read ${REMOTE_INDEX_KEY} (${e instanceof Error ? e.message : e}); sending every app`);
  }
  const previous = parseRemoteIndex(bytes);
  if (args.full) console.log("publish-apps: --full, ignoring the remote index");
  else if (!previous && generation !== null) console.log(`publish-apps: no usable ${REMOTE_INDEX_KEY}; every app counts as changed`);
  const baseline = args.full ? null : previous?.apps ?? null;

  // 3. what changed
  const changed = diffApps(index, baseline);
  console.log(`publish-apps: ${changed.length} changed, ${artifacts.length - changed.length} unchanged`);
  if (changed.length === 0) {
    output(0);
    return;
  }
  for (const i of changed.slice(0, 50)) console.log(`  ${index.apps[i].id}@${index.apps[i].version}`);
  if (changed.length > 50) console.log(`  … and ${changed.length - 50} more`);

  // 4. upload the changed apps and their artifact index
  const subIndex = { apps: changed.map((i) => index.apps[i]) };
  const subArtifacts = changed.map((i) => artifacts[i]);
  const { indexJson, indexSha256 } = serializeIndex(subArtifacts);
  const indexPath = path.join(args.dist, "publish-index.json");
  fs.writeFileSync(indexPath, indexJson);
  const plan = planUploads(subIndex, subArtifacts, { dist: args.dist });
  plan.push({ key: blobKeyIndex(indexSha256), file: indexPath });
  const up = await uploadAll(plan, put);
  console.log(`publish-apps: uploaded ${up.uploaded}/${plan.length} file(s), errors=${up.errors.length}`);
  if (up.errors.length) {
    for (const e of up.errors.slice(0, 20)) console.error(`  upload failed ${e.key}: ${e.message}`);
    throw new Error(`${up.errors.length} upload(s) failed; not calling publish-index`);
  }

  // 5. notify the server
  const { status, body } = await postPublishIndex({
    apiUrl: env.W6W_API_URL,
    secret: env.OPS_JWT_SECRET,
    indexSha256,
  });
  const sum = summarizeResult(status, body);
  for (const l of sum.lines) (sum.ok ? console.log : console.error)(l);
  output(sum.changed);
  if (status < 200 || status >= 300) {
    process.exitCode = 1;
    return;
  }

  // 6. record what the server accepted
  const next = nextRemoteIndex({
    index,
    artifacts,
    changed,
    previous: previous?.apps,
    results: body?.results,
    now: new Date().toISOString(),
    commit: env.GITHUB_SHA,
  });
  // The publish already succeeded, so a failed write only costs the next run a resend: warn.
  try {
    if (generation === null) throw new Error("it could not be read, so there is no generation to match");
    await remote.write(JSON.stringify(next, null, 2) + "\n", generation);
    console.log(`publish-apps: ${REMOTE_INDEX_KEY} updated (${Object.keys(next.apps).length} app(s))`);
  } catch (e) {
    warn(`${REMOTE_INDEX_KEY} not updated: ${e instanceof Error ? e.message : e}`);
  }
  if (!sum.ok) process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((e) => {
    console.error(`publish-apps: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  });
}
