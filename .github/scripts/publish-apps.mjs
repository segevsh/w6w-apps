/**
 * CI entrypoint for `packages/apps`'s publish workflow (`.github/workflows/reload-apps.yml`).
 *
 * The workflow has already built the pack (`app-build --pack w6w-pack.json -o dist`). This script:
 *   1. reads `dist/index.json` + every `dist/<id>/<version>/manifest.json`; aborts if the build
 *      reported `failures`;
 *   2. assembles the artifact index `{ artifactIndexVersion: 1, artifacts: [manifest, ...] }`
 *      (index order), writes it to `dist/publish-index.json`; `indexSha256` is the sha-256 of those
 *      exact bytes;
 *   3. uploads CREATE-ONLY: each `app.js` to `apps/exec/<execSha256>.js` (asserting the file's own
 *      sha-256 first), each `app.js.map` to `apps/map/<sha>.js.map`, the index to
 *      `apps/index/<indexSha256>.json`. GCS: JSON API with `ifGenerationMatch=0` (412 = already
 *      there = success), bounded concurrency, no process spawn per object. Local rehearsal
 *      (`--dry-run-local <dir>`): same keys under `<dir>/<key>` (the server's fs blob layout),
 *      create-only via hard link;
 *   4. makes ONE `POST $W6W_API_URL/system-ops/apps/publish-index {"indexSha256"}` with a fresh
 *      HS256 ops JWT (aud `w6w:system-ops`, scope `apps:publish`, 120 s TTL);
 *   5. prints every failure and exits 1 on `failed > 0` / non-2xx; writes `changed=<n>` to
 *      `$GITHUB_OUTPUT` so the workflow can skip the site rebuild when nothing changed.
 *
 * Plain Node, zero deps (`fetch`, `node:crypto`, `node:fs`). Never logs the secret or a token.
 *
 * Env: `W6W_API_URL`, `OPS_JWT_SECRET` (always); for GCS: `W6W_BLOB_BUCKET` (default
 * `w6w-io-blobs`) and either `GCS_ACCESS_TOKEN` or a `gcloud` on PATH (authenticated by
 * `google-github-actions/auth`).
 * Usage: `node .github/scripts/publish-apps.mjs [--dist dist] [--dry-run-local <blobdir>]`
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
  const indexJson = JSON.stringify({ artifactIndexVersion: 1, artifacts });
  return { artifacts, indexJson, indexSha256: sha256Hex(Buffer.from(indexJson, "utf8")) };
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
 * Run `put(item)` over `items` with at most `concurrency` in flight. `put` resolves
 * `"created" | "exists"`; a rejection is collected, not thrown mid-batch. Returns
 * `{ created, exists, errors: [{key, message}] }`.
 */
export async function uploadAll(items, put, concurrency = UPLOAD_CONCURRENCY) {
  const out = { created: 0, exists: 0, errors: [] };
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const item = items[next++];
      try {
        const r = await put(item);
        if (r === "created") out.created++;
        else if (r === "exists") out.exists++;
        else throw new Error(`put returned ${String(r)}`);
      } catch (e) {
        out.errors.push({ key: item.key, message: e instanceof Error ? e.message : String(e) });
      }
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, worker));
  return out;
}

/** Create-only put into a local blob dir (`<dir>/<key>`, the server's fs driver layout). */
export function makeLocalPut(dir) {
  return async ({ key, file, bytes }) => {
    const final = path.join(dir, key);
    if (fs.existsSync(final)) return "exists";
    const tmpDir = path.join(dir, ".tmp");
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.mkdirSync(path.dirname(final), { recursive: true });
    const tmp = path.join(tmpDir, `put.${crypto.randomUUID()}`);
    fs.writeFileSync(tmp, bytes ?? fs.readFileSync(file));
    try {
      fs.linkSync(tmp, final);
      return "created";
    } catch (e) {
      if (e.code === "EEXIST") return "exists";
      throw e;
    } finally {
      fs.rmSync(tmp, { force: true });
    }
  };
}

/** Create-only put into GCS via the JSON API (`ifGenerationMatch=0`; 412 = already there). */
export function makeGcsPut(bucket, accessToken, fetchImpl = fetch) {
  return async ({ key, file, bytes }) => {
    const url = `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucket)}/o` +
      `?uploadType=media&ifGenerationMatch=0&name=${encodeURIComponent(key)}`;
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
      if (res.ok) return "created";
      if (res.status === 412) return "exists";
      if (res.status >= 500 && attempt < 3) continue;
      throw new Error(`GCS ${res.status} for ${key}`);
    }
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
  const o = { dist: "dist", localDir: undefined };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--dist") o.dist = argv[++i];
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

  const { index, manifests } = readDist(args.dist);
  const { artifacts, indexJson, indexSha256 } = assembleIndex(index, manifests);
  const indexPath = path.join(args.dist, "publish-index.json");
  fs.writeFileSync(indexPath, indexJson);
  console.log(`publish-apps: ${artifacts.length} artifact(s), indexSha256=${indexSha256}`);

  const plan = planUploads(index, artifacts, { dist: args.dist });
  plan.push({ key: blobKeyIndex(indexSha256), file: indexPath });

  let put;
  if (localDir) {
    put = makeLocalPut(localDir);
    console.log(`publish-apps: local blob dir ${localDir}`);
  } else {
    const token = env.GCS_ACCESS_TOKEN ||
      execFileSync("gcloud", ["auth", "print-access-token"], { encoding: "utf8" }).trim();
    put = makeGcsPut(env.W6W_BLOB_BUCKET || DEFAULT_BUCKET, token);
  }
  const up = await uploadAll(plan, put);
  console.log(`publish-apps: uploads created=${up.created} existing=${up.exists} errors=${up.errors.length}`);
  if (up.errors.length) {
    for (const e of up.errors.slice(0, 20)) console.error(`  upload failed ${e.key}: ${e.message}`);
    throw new Error(`${up.errors.length} upload(s) failed; not calling publish-index`);
  }

  const { status, body } = await postPublishIndex({
    apiUrl: env.W6W_API_URL,
    secret: env.OPS_JWT_SECRET,
    indexSha256,
  });
  const sum = summarizeResult(status, body);
  for (const l of sum.lines) (sum.ok ? console.log : console.error)(l);
  if (env.GITHUB_OUTPUT) fs.appendFileSync(env.GITHUB_OUTPUT, `changed=${sum.changed}\n`);
  if (!sum.ok) process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((e) => {
    console.error(`publish-apps: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  });
}
