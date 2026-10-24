import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  assembleIndex,
  assertExecKey,
  blobKeyExec,
  main,
  makeGcsPut,
  mintToken,
  planUploads,
  postPublishIndex,
  sha256Hex,
  summarizeResult,
  uploadAll,
} from "./publish-apps.mjs";

const sha = (s) => sha256Hex(Buffer.from(s));
const mk = (id, body) => {
  const execSha256 = sha(body);
  return {
    entry: { id, version: "1.0.0", execSha256 },
    manifest: { id, version: "1.0.0", exec: { sha256: execSha256 } },
    body,
  };
};

test("assembleIndex keeps index order and hashes the exact bytes", () => {
  const a = mk("a", "A");
  const b = mk("b", "B");
  const r = assembleIndex({ apps: [b.entry, a.entry], failures: [] }, {
    "a@1.0.0": a.manifest,
    "b@1.0.0": b.manifest,
  });
  const parsed = JSON.parse(r.indexJson);
  assert.equal(parsed.artifactIndexVersion, 1);
  assert.deepEqual(parsed.artifacts.map((m) => m.id), ["b", "a"]);
  assert.equal(r.indexSha256, sha(r.indexJson));
});

test("assembleIndex aborts on build failures, missing manifest, sha mismatch", () => {
  const a = mk("a", "A");
  assert.throws(
    () => assembleIndex({ apps: [], failures: [{ path: "x", code: "C", message: "m" }] }, {}),
    /1 failure/,
  );
  assert.throws(() => assembleIndex({ apps: [a.entry], failures: [] }, {}), /no manifest/);
  const bad = { ...a.manifest, exec: { sha256: "0".repeat(64) } };
  assert.throws(
    () => assembleIndex({ apps: [a.entry], failures: [] }, { "a@1.0.0": bad }),
    /exec\.sha256/,
  );
});

test("exec key is apps/exec/<sha>.js and mismatches throw", () => {
  const s = sha("A");
  assert.equal(blobKeyExec(s), `apps/exec/${s}.js`);
  assertExecKey(`apps/exec/${s}.js`, s);
  assert.throws(() => assertExecKey(`apps/exec/${sha("B")}.js`, s));
  assert.throws(() => assertExecKey(`apps/other/${s}.js`, s));
});

test("planUploads: key == apps/exec/<sha>.js; file sha mismatch aborts", () => {
  const a = mk("a", "A");
  const plan = planUploads({ apps: [a.entry] }, [a.manifest], {
    dist: "d",
    readFile: () => Buffer.from("A"),
  });
  assert.equal(plan[0].key, `apps/exec/${a.entry.execSha256}.js`);
  assert.throws(
    () => planUploads({ apps: [a.entry] }, [a.manifest], { dist: "d", readFile: () => Buffer.from("tampered") }),
    /app\.js sha-256/,
  );
});

test("mintToken: HS256 shape, aud/scope, exp-iat=120, verifiable", () => {
  const secret = "s3cret";
  const t = mintToken(secret, "apps:publish", 1000);
  const [h, p, s] = t.split(".");
  const dec = (x) => JSON.parse(Buffer.from(x, "base64url").toString());
  assert.deepEqual(dec(h), { alg: "HS256", typ: "JWT" });
  const pl = dec(p);
  assert.equal(pl.aud, "w6w:system-ops");
  assert.equal(pl.scope, "apps:publish");
  assert.equal(pl.exp - pl.iat, 120);
  const want = crypto.createHmac("sha256", secret).update(`${h}.${p}`).digest("base64url");
  assert.equal(s, want);
  assert.throws(() => mintToken(""));
});

test("uploadAll: collects errors, counts created/exists, bounds concurrency", async () => {
  let inflight = 0, peak = 0;
  const items = Array.from({ length: 20 }, (_, i) => ({ key: `k${i}` }));
  const r = await uploadAll(items, async ({ key }) => {
    inflight++;
    peak = Math.max(peak, inflight);
    await new Promise((res) => setTimeout(res, 2));
    inflight--;
    if (key === "k3") throw new Error("boom");
    return Number(key.slice(1)) % 2 ? "exists" : "created";
  }, 4);
  assert.ok(peak <= 4);
  assert.equal(r.errors.length, 1);
  assert.equal(r.errors[0].key, "k3");
  assert.equal(r.created + r.exists, 19);
});

test("GCS put is create-only (ifGenerationMatch=0); 412 is success; other errors throw", async () => {
  const urls = [];
  const mkFetch = (status) => async (url) => {
    urls.push(url);
    return { ok: status < 300, status };
  };
  const item = { key: "apps/exec/x.js", bytes: Buffer.from("x") };
  assert.equal(await makeGcsPut("b", "tok", mkFetch(200))(item), "created");
  assert.ok(urls[0].includes("ifGenerationMatch=0"));
  assert.ok(urls[0].includes(encodeURIComponent("apps/exec/x.js")));
  assert.equal(await makeGcsPut("b", "tok", mkFetch(412))(item), "exists");
  await assert.rejects(makeGcsPut("b", "tok", mkFetch(403))(item), /403/);
});

test("summarizeResult: failed>0 or non-2xx is not ok; prints failures", () => {
  assert.equal(summarizeResult(200, { total: 2, changed: 2, failed: 0, results: [] }).ok, true);
  assert.equal(summarizeResult(200, { total: 2, changed: 2, failed: 0 }).changed, 2);
  const f = summarizeResult(200, {
    total: 2,
    changed: 1,
    failed: 1,
    results: [{ outcome: "failed", id: "z", version: "1", error: { code: "E", message: "bad" } }],
  });
  assert.equal(f.ok, false);
  assert.ok(f.lines.some((l) => l.includes("z@1") && l.includes("bad")));
  const h = summarizeResult(401, { error: { code: "unauthorized", message: "no" } });
  assert.equal(h.ok, false);
  assert.ok(h.lines[0].includes("401"));
});

test("postPublishIndex: one POST, bearer JWT, body; no retry on 4xx", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return { status: 401, text: async () => '{"error":{"code":"x","message":"y"}}' };
  };
  const r = await postPublishIndex({ apiUrl: "http://h/", secret: "s", indexSha256: "ab", fetchImpl });
  assert.equal(r.status, 401);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "http://h/system-ops/apps/publish-index");
  assert.deepEqual(JSON.parse(calls[0].init.body), { indexSha256: "ab" });
  assert.match(calls[0].init.headers.authorization, /^Bearer [\w-]+\.[\w-]+\.[\w-]+$/);
});

test("main local-dir mode writes the same keys and treats re-run as success", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pub-"));
  const dist = path.join(tmp, "dist");
  const blobs = path.join(tmp, "blobs");
  const a = mk("a", "A");
  const dir = path.join(dist, "a", "1.0.0");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "app.js"), "A");
  fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(a.manifest));
  fs.writeFileSync(path.join(dist, "index.json"), JSON.stringify({ apps: [a.entry], failures: [] }));
  const posts = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    posts.push({ url, body: init.body });
    return {
      status: 200,
      text: async () => JSON.stringify({ total: 1, changed: 1, failed: 0, results: [] }),
    };
  };
  const out = path.join(tmp, "gh_out");
  const env = { W6W_API_URL: "http://api", OPS_JWT_SECRET: "s", GITHUB_OUTPUT: out };
  const log = console.log;
  console.log = () => {};
  const prev = process.exitCode;
  try {
    await main(["--dist", dist, "--dry-run-local", blobs], env);
    await main(["--dist", dist, "--dry-run-local", blobs], env);
  } finally {
    console.log = log;
    globalThis.fetch = realFetch;
  }
  assert.equal(process.exitCode, prev);
  assert.equal(fs.readFileSync(path.join(blobs, `apps/exec/${a.entry.execSha256}.js`), "utf8"), "A");
  const idxSha = JSON.parse(posts[0].body).indexSha256;
  assert.equal(sha256Hex(fs.readFileSync(path.join(blobs, `apps/index/${idxSha}.json`))), idxSha);
  assert.equal(posts.length, 2);
  assert.match(fs.readFileSync(out, "utf8"), /changed=1/);
});

test("main exits nonzero when failed>0", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pub-"));
  fs.writeFileSync(path.join(tmp, "index.json"), JSON.stringify({ apps: [], failures: [] }));
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    status: 200,
    text: async () => JSON.stringify({ total: 1, changed: 0, failed: 1, results: [] }),
  });
  const prev = process.exitCode;
  const log = console.log, err = console.error;
  console.log = console.error = () => {};
  try {
    await main(["--dist", tmp, "--dry-run-local", path.join(tmp, "b")], { W6W_API_URL: "http://a", OPS_JWT_SECRET: "s" });
    assert.equal(process.exitCode, 1);
  } finally {
    process.exitCode = prev;
    console.log = log;
    console.error = err;
    globalThis.fetch = realFetch;
  }
});
