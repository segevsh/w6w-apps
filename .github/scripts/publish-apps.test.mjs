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
  diffApps,
  main,
  makeGcsPut,
  makeGcsRemoteIndex,
  mintToken,
  nextRemoteIndex,
  parseRemoteIndex,
  planUploads,
  postPublishIndex,
  REMOTE_INDEX_KEY,
  sha256Hex,
  summarizeResult,
  uploadAll,
} from "./publish-apps.mjs";

const sha = (s) => sha256Hex(Buffer.from(s));
const mk = (id, body) => {
  const execSha256 = sha(body);
  return {
    entry: { id, version: "1.0.0", execSha256, digest: sha(`digest:${body}`), digestVersion: 2 },
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

test("uploadAll: collects errors, counts uploads, bounds concurrency", async () => {
  let inflight = 0, peak = 0;
  const items = Array.from({ length: 20 }, (_, i) => ({ key: `k${i}` }));
  const r = await uploadAll(items, async ({ key }) => {
    inflight++;
    peak = Math.max(peak, inflight);
    await new Promise((res) => setTimeout(res, 2));
    inflight--;
    if (key === "k3") throw new Error("boom");
  }, 4);
  assert.ok(peak <= 4);
  assert.equal(r.errors.length, 1);
  assert.equal(r.errors[0].key, "k3");
  assert.equal(r.uploaded, 19);
});

test("GCS put overwrites (no generation precondition); retries 429/5xx; other errors throw", async () => {
  const urls = [];
  const mkFetch = (...statuses) => async (url) => {
    urls.push(url);
    const status = statuses.shift();
    return { ok: status < 300, status };
  };
  const item = { key: "apps/exec/x.js", bytes: Buffer.from("x") };
  await makeGcsPut("b", "tok", mkFetch(200))(item);
  assert.ok(!urls[0].includes("ifGenerationMatch"));
  assert.ok(urls[0].includes(encodeURIComponent("apps/exec/x.js")));
  await makeGcsPut("b", "tok", mkFetch(429, 503, 200))(item);
  assert.equal(urls.length, 4);
  await assert.rejects(makeGcsPut("b", "tok", mkFetch(412))(item), /412/);
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

test("main local-dir mode writes the keys; a re-run with nothing changed calls nothing", async () => {
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
  // The second run finds every app in apps/index.json and calls nothing.
  assert.equal(posts.length, 1);
  assert.match(fs.readFileSync(out, "utf8"), /changed=1\nchanged=0\n/);
  const remote = JSON.parse(fs.readFileSync(path.join(blobs, REMOTE_INDEX_KEY), "utf8"));
  assert.deepEqual(remote.apps.a, {
    version: "1.0.0",
    digest: a.entry.digest,
    digestVersion: 2,
    execSha256: a.entry.execSha256,
  });
});

test("main exits nonzero when failed>0", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pub-"));
  writeDist(tmp, [mk("a", "A")]);
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

function writeDist(dist, apps) {
  for (const x of apps) {
    const dir = path.join(dist, x.entry.id, x.entry.version);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "app.js"), x.body);
    fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(x.manifest));
  }
  fs.writeFileSync(path.join(dist, "index.json"), JSON.stringify({ apps: apps.map((x) => x.entry), failures: [] }));
}

/** Run `main` against a local blob dir with a stubbed publish-index; returns the POSTed indexes. */
async function runMain(dist, blobs, { argv = [], reply } = {}) {
  const posts = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (_url, init) => {
    const { indexSha256 } = JSON.parse(init.body);
    posts.push(JSON.parse(fs.readFileSync(path.join(blobs, `apps/index/${indexSha256}.json`), "utf8")));
    const r = reply ?? { status: 200, body: { total: 1, changed: 1, failed: 0, results: [] } };
    return { status: r.status, text: async () => JSON.stringify(r.body) };
  };
  const log = console.log, err = console.error, wrn = console.warn;
  const warnings = [];
  console.log = console.error = () => {};
  console.warn = (m) => warnings.push(m);
  const prev = process.exitCode;
  let exitCode;
  try {
    await main(["--dist", dist, "--dry-run-local", blobs, ...argv], { W6W_API_URL: "http://api", OPS_JWT_SECRET: "s" });
  } finally {
    exitCode = process.exitCode;
    process.exitCode = prev;
    console.log = log;
    console.error = err;
    console.warn = wrn;
    globalThis.fetch = realFetch;
  }
  return { posts, exitCode, warnings };
}

const tmpPair = () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pub-"));
  return { dist: path.join(tmp, "dist"), blobs: path.join(tmp, "blobs") };
};
const remoteOf = (blobs) => JSON.parse(fs.readFileSync(path.join(blobs, REMOTE_INDEX_KEY), "utf8"));

test("diffApps: missing, version, digest or exec change counts; no baseline = all", () => {
  const a = mk("a", "A"), b = mk("b", "B"), c = mk("c", "C"), d = mk("d", "D");
  const index = { apps: [a.entry, b.entry, c.entry, d.entry] };
  const rec = (e) => ({ version: e.version, digest: e.digest, digestVersion: 2, execSha256: e.execSha256 });
  const remote = {
    a: rec(a.entry),
    b: { ...rec(b.entry), version: "0.9.0" },
    c: { ...rec(c.entry), digest: sha("old") },
  };
  assert.deepEqual(diffApps(index, remote), [1, 2, 3]);
  assert.deepEqual(diffApps(index, { ...remote, b: rec(b.entry), c: rec(c.entry), d: rec(d.entry) }), []);
  assert.deepEqual(diffApps(index, { a: { ...rec(a.entry), execSha256: sha("x") } }), [0, 1, 2, 3]);
  assert.deepEqual(diffApps(index, null), [0, 1, 2, 3]);
});

test("nextRemoteIndex: a failed changed app keeps its previous entry, or stays out", () => {
  const a = mk("a", "A"), b = mk("b", "B"), c = mk("c", "C");
  const index = { apps: [a.entry, b.entry, c.entry] };
  const artifacts = [a.manifest, b.manifest, c.manifest];
  const prevB = { version: "0.9.0", digest: sha("old"), digestVersion: 2, execSha256: sha("old") };
  const doc = nextRemoteIndex({
    index,
    artifacts,
    changed: [1, 2],
    previous: { a: { version: "1.0.0" }, b: prevB },
    results: [
      { id: "b", version: "1.0.0", outcome: "failed", error: { code: "x", message: "y" } },
      { id: "c", version: "1.0.0", outcome: "registered" },
    ],
    now: "t",
    commit: "abc",
  });
  assert.equal(doc.remoteIndexVersion, 1);
  assert.equal(doc.commit, "abc");
  assert.equal(doc.apps.a.execSha256, a.entry.execSha256);
  assert.deepEqual(doc.apps.b, prevB);
  assert.equal(doc.apps.c.digest, c.entry.digest);
  // An unattributable failure: no changed app is recorded as accepted.
  const anon = nextRemoteIndex({ index, artifacts, changed: [1, 2], previous: {}, results: [{ id: null, outcome: "failed" }] });
  assert.deepEqual(Object.keys(anon.apps), ["a"]);
});

test("parseRemoteIndex: absent or unrecognisable is no baseline", () => {
  assert.equal(parseRemoteIndex(null), null);
  assert.equal(parseRemoteIndex(Buffer.from("{not json")), null);
  assert.equal(parseRemoteIndex(Buffer.from(JSON.stringify({ remoteIndexVersion: 2, apps: {} }))), null);
  assert.deepEqual(parseRemoteIndex(Buffer.from(JSON.stringify({ remoteIndexVersion: 1, apps: { a: {} } }))).apps, { a: {} });
});

test("GCS remote index: 404 is generation 0; reads that generation; write is conditional; 412 throws", async () => {
  const calls = [];
  const replies = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url, init });
    return replies.shift();
  };
  const r = makeGcsRemoteIndex("bkt", "tok", fetchImpl);
  replies.push({ status: 404, ok: false });
  assert.deepEqual(await r.read(), { bytes: null, generation: "0" });
  assert.equal(calls[0].url, "https://storage.googleapis.com/storage/v1/b/bkt/o/apps%2Findex.json");
  assert.equal(calls[0].init.headers.authorization, "Bearer tok");

  replies.push({ status: 200, ok: true, json: async () => ({ generation: "17" }) });
  replies.push({ status: 200, ok: true, arrayBuffer: async () => new TextEncoder().encode("{}").buffer });
  const got = await r.read();
  assert.equal(got.generation, "17");
  assert.equal(got.bytes.toString(), "{}");
  assert.match(calls[2].url, /\?alt=media&generation=17$/);

  replies.push({ status: 200, ok: true });
  await r.write("{}", "17");
  assert.match(calls[3].url, /ifGenerationMatch=17&name=apps%2Findex\.json$/);
  assert.equal(calls[3].init.method, "POST");

  replies.push({ status: 412, ok: false });
  await assert.rejects(r.write("{}", "17"), /changed since it was read/);
});

test("main uploads and publishes only the apps that changed since apps/index.json", async () => {
  const { dist, blobs } = tmpPair();
  const a = mk("a", "A"), b = mk("b", "B");
  writeDist(dist, [a, b]);
  let run = await runMain(dist, blobs);
  assert.deepEqual(run.posts[0].artifacts.map((m) => m.id), ["a", "b"]);

  // b changes; a is untouched. Clear the bucket's execs to see which ones are uploaded again.
  fs.rmSync(path.join(blobs, "apps/exec"), { recursive: true });
  const b2 = mk("b", "B2");
  writeDist(dist, [a, b2]);
  run = await runMain(dist, blobs);
  assert.equal(run.exitCode, undefined);
  assert.deepEqual(run.posts[0].artifacts.map((m) => m.id), ["b"]);
  assert.equal(fs.existsSync(path.join(blobs, `apps/exec/${a.entry.execSha256}.js`)), false);
  assert.equal(fs.existsSync(path.join(blobs, `apps/exec/${b2.entry.execSha256}.js`)), true);
  assert.equal(remoteOf(blobs).apps.b.execSha256, b2.entry.execSha256);
});

test("main: a failed app is not recorded, so the next run sends it again", async () => {
  const { dist, blobs } = tmpPair();
  const a = mk("a", "A"), b = mk("b", "B");
  writeDist(dist, [a, b]);
  let run = await runMain(dist, blobs, {
    reply: { status: 200, body: { total: 2, changed: 1, failed: 1, results: [{ id: "b", version: "1.0.0", outcome: "failed", error: { code: "c", message: "m" } }] } },
  });
  assert.equal(run.exitCode, 1);
  assert.deepEqual(Object.keys(remoteOf(blobs).apps), ["a"]);
  run = await runMain(dist, blobs);
  assert.deepEqual(run.posts[0].artifacts.map((m) => m.id), ["b"]);
});

test("main: a non-2xx publish leaves apps/index.json untouched", async () => {
  const { dist, blobs } = tmpPair();
  writeDist(dist, [mk("a", "A")]);
  const run = await runMain(dist, blobs, { reply: { status: 503, body: { error: { code: "down", message: "x" } } } });
  assert.equal(run.exitCode, 1);
  assert.equal(fs.existsSync(path.join(blobs, REMOTE_INDEX_KEY)), false);
});

test("main --full ignores apps/index.json and sends every app", async () => {
  const { dist, blobs } = tmpPair();
  writeDist(dist, [mk("a", "A"), mk("b", "B")]);
  await runMain(dist, blobs);
  const run = await runMain(dist, blobs, { argv: ["--full"] });
  assert.deepEqual(run.posts[0].artifacts.map((m) => m.id), ["a", "b"]);
});

test("main: an unreadable apps/index.json sends every app and only warns", async () => {
  const { dist, blobs } = tmpPair();
  writeDist(dist, [mk("a", "A")]);
  // A directory where the file should be: both the read and the write fail.
  fs.mkdirSync(path.join(blobs, REMOTE_INDEX_KEY), { recursive: true });
  const run = await runMain(dist, blobs);
  assert.equal(run.exitCode, undefined);
  assert.deepEqual(run.posts[0].artifacts.map((m) => m.id), ["a"]);
  assert.equal(run.warnings.length, 2);
  assert.match(run.warnings[0], /^::warning title=publish-apps::cannot read apps\/index\.json/);
  assert.match(run.warnings[1], /apps\/index\.json not updated/);
});

test("main overwrites a changed app's files that already exist in the bucket", async () => {
  const { dist, blobs } = tmpPair();
  const a = mk("a", "A");
  writeDist(dist, [a]);
  const key = path.join(blobs, `apps/exec/${a.entry.execSha256}.js`);
  fs.mkdirSync(path.dirname(key), { recursive: true });
  fs.writeFileSync(key, "stale bytes");
  await runMain(dist, blobs);
  assert.equal(fs.readFileSync(key, "utf8"), "A");
});
