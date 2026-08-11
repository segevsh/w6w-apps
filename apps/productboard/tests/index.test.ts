import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 41;

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 1);
  assertEquals(app.healthChecks.length, 3);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const key of keys) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
  }
});

Deno.test("index: every action key matches its file name", async () => {
  const onDisk: string[] = [];
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (entry.isFile && entry.name.endsWith(".ts")) onDisk.push(entry.name.replace(/\.ts$/, ""));
  }
  assertEquals(
    app.actions.map((a) => a.key).sort(),
    onDisk.sort(),
    "an action file is not wired into index.ts, or is wired under a different key",
  );
});

Deno.test("index: every action declares a valid type, a description and an execute hook", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type ${a.type}`);
    assert(
      typeof a.description === "string" && a.description.length > 0,
      `${a.key}: no description`,
    );
    assertEquals(typeof a.execute, "function", `${a.key}: no execute`);
    assert(Array.isArray(a.output), `${a.key}: no output`);
  }
});

Deno.test("index: every perform action states idempotency explicitly", () => {
  const performs = app.actions.filter((a) => a.type === "perform");
  assert(performs.length > 0, "no perform actions — this test would pass vacuously");
  for (const a of performs) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
});

/**
 * Productboard's create endpoints accept no idempotency key of any kind, so a
 * retry files a second record. The runtime may retry an action marked
 * idempotent; marking any of these `true` would turn one dropped connection
 * into a duplicate note, a duplicate entity, a duplicate comment, or an
 * endpoint receiving every webhook event twice.
 */
Deno.test("index: no create action is marked idempotent", () => {
  for (
    const key of [
      "entity-create",
      "note-create",
      "note-comment-create",
      "webhook-create",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

/**
 * The converse, so the rule above is a judgement rather than blanket caution:
 * these genuinely converge on replay, which is what lets the runtime recover
 * from a dropped connection instead of failing the run.
 */
Deno.test("index: the absolute updates, deletes and links are marked idempotent", () => {
  for (
    const key of [
      "entity-update",
      "entity-delete",
      "entity-relationship-create",
      "entity-relationship-delete",
      "entity-parent-set",
      "note-update",
      "note-delete",
      "note-relationship-create",
      "note-relationship-delete",
      "webhook-delete",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, true, key);
  }
});

Deno.test("index: every param has a key and a label", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(typeof p.key === "string" && p.key.length > 0, `${a.key}: param without a key`);
      assert(typeof p.label === "string" && p.label.length > 0, `${a.key}/${p.key}: no label`);
    }
  }
});

Deno.test("index: no action declares a duplicate param key", () => {
  for (const a of app.actions) {
    const keys = (a.params ?? []).map((p) => p.key);
    assertEquals(new Set(keys).size, keys.length, `${a.key}: duplicate param key`);
  }
});

/**
 * Strip comments so the sandbox guards below scan CODE, not prose.
 *
 * Without this the checks are simultaneously too weak and too strong: a doc
 * comment explaining *why* an action never touches the credential trips the
 * assertion, while a reviewer's natural fix — deleting the explanation — would
 * leave a real violation just as invisible.
 */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const actionSource = async (key: string) =>
  code(await Deno.readTextFile(new URL(`../actions/${key}.ts`, import.meta.url)));

Deno.test("index: no action reads a credential — signing is the auth hook's job", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/credential/i.test(src), `${a.key}: references a credential`);
    assert(!/authorization\s*[\]:=]/i.test(src), `${a.key}: sets the auth header itself`);
    assert(!/\bbearer\b\s*[$`"']/i.test(src), `${a.key}: builds a bearer token`);
  }
});

Deno.test("index: no action calls global fetch or touches Deno.*", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/(^|[^.\w])fetch\s*\(/.test(src), `${a.key}: calls a bare fetch`);
    assert(!/\bDeno\./.test(src), `${a.key}: touches Deno.*`);
  }
});

/**
 * The API origin lives in `lib/client.ts` and nowhere else. An action that
 * hard-coded a host — or accepted one as a param — could be pointed somewhere
 * the manifest never allowlisted.
 */
Deno.test("index: no action hard-codes a host", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/productboard\.com/.test(src), `${a.key}: contains a Productboard host literal`);
    assert(!/https?:\/\//.test(src), `${a.key}: contains an absolute URL`);
  }
});

Deno.test("index: connection identity is never reachable as an action param", () => {
  const banned = /^(host|origin|domain|base_?url|api_?key|api_?token|token|account|workspace)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

// --- the version invariant, derived rather than asserted once ----------------

/**
 * `X-Version: 1` belongs to API v1, whose OpenAPI document marks all 119 of its
 * operations `deprecated: true`. v2 takes no version header — the vendor's
 * migration guide says so under "No X-Version header required", and the string
 * appears zero times across the nine v2 documents.
 *
 * This is derived over every source file rather than asserted about the client
 * alone, so a future action, health check or auth hook that reintroduces the
 * header fails here.
 */
async function everySource(): Promise<Array<{ path: string; src: string }>> {
  const out: Array<{ path: string; src: string }> = [];
  for (const dir of ["actions", "auth", "health", "lib"]) {
    for await (const entry of Deno.readDir(new URL(`../${dir}`, import.meta.url))) {
      if (!entry.isFile || !entry.name.endsWith(".ts")) continue;
      const path = `${dir}/${entry.name}`;
      out.push({
        path,
        src: code(await Deno.readTextFile(new URL(`../${path}`, import.meta.url))),
      });
    }
  }
  out.push({
    path: "index.ts",
    src: code(await Deno.readTextFile(new URL("../index.ts", import.meta.url))),
  });
  return out;
}

Deno.test("index: nothing sends an X-Version header — that belongs to the deprecated v1 API", async () => {
  const sources = await everySource();
  assertEquals(sources.length, 41 + 1 + 3 + 2 + 1, "the source sweep lost files");
  for (const { path, src } of sources) {
    assert(!/x-version/i.test(src), `${path}: sends an X-Version header`);
  }
});

Deno.test("index: nothing calls the deprecated v1 API — every request is v2-prefixed", async () => {
  const { API_PREFIX } = await import("../lib/client.ts");
  assertEquals(API_PREFIX, "/v2");
  for (const { path, src } of await everySource()) {
    if (path === "lib/client.ts") continue;
    assert(!/["'`]\/v1\//.test(src), `${path}: builds a v1 path`);
  }
});

/**
 * The reachability probe must be a GET. `HEAD` on a live v2 path answers 404
 * `route.notFound` while `GET` on the identical URL answers 401 (measured
 * 2026-08-11), so a HEAD probe reports a healthy route as a dead one.
 */
Deno.test("index: no health probe uses HEAD, which this API does not route", async () => {
  for (const { path, src } of await everySource()) {
    if (!path.startsWith("health/")) continue;
    assert(!/method:\s*["'`]HEAD["'`]/i.test(src), `${path}: probes with HEAD`);
  }
});

// --- auth --------------------------------------------------------------------

/**
 * The auth probe is pinned by path.
 *
 * Choosing it is the step where customer data most easily leaks into the health
 * surface. `/v2/members` returns every member's email address and `/v2/entities`
 * returns the workspace's roadmap; `/v2/entities/configurations` returns the
 * *shape* of the workspace and nothing in it. If someone swaps it, this makes
 * them do it deliberately.
 */
Deno.test("index: the auth probe is /entities/configurations", async () => {
  const src = code(await Deno.readTextFile(new URL("../auth/api-token.ts", import.meta.url)));
  assert(src.includes("/entities/configurations"), "auth probe moved off the configuration read");
  assert(
    !/PROBE_PATH\s*=\s*["'`]\/members/.test(src),
    "the probe was pointed at the member list, which returns every member's email",
  );
});

Deno.test("index: nothing in auth or health probes a path that returns member emails", async () => {
  for (const { path, src } of await everySource()) {
    if (!path.startsWith("auth/") && !path.startsWith("health/")) continue;
    assert(!/["'`]\/members/.test(src), `${path}: probes the member surface`);
  }
});

Deno.test("index: the credential field is declared secret", () => {
  const [method] = app.auth;
  assertEquals(method.key, "api-token");
  assertEquals(method.type, "bearer");
  const fields = method.fields ?? [];
  assert(fields.length > 0, "no credential fields — this test would pass vacuously");
  for (const f of fields) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
  assertEquals(typeof method.test, "function");
  assertEquals(typeof method.sign, "function");
});

// --- health ------------------------------------------------------------------

Deno.test("index: every health check is either probing or declared unavailable", () => {
  for (const h of app.healthChecks) {
    const hasCheck = typeof h.check === "function";
    const hasUnavailable = typeof h.unavailable?.reason === "string";
    assert(hasCheck !== hasUnavailable, `${h.key}: must have exactly one of check/unavailable`);
    assert(typeof h.title === "string" && h.title.length > 0, `${h.key}: no title`);
    assert(typeof h.kind === "string" && h.kind.length > 0, `${h.key}: no kind`);
  }
});

/** A check that widens egress must be unsigned — a status host never sees the token. */
Deno.test("index: any health check declaring extra egress is unsigned", () => {
  const widening = app.healthChecks.filter((h) => h.network?.allow?.length);
  assert(widening.length > 0, "no check widens egress — this test would pass vacuously");
  for (const h of widening) {
    assert(
      h.credential === "none" || h.credential === "context",
      `${h.key}: widens egress while signed`,
    );
  }
});

/**
 * The quota check reports `unknown` whenever Productboard omits the rate-limit
 * headers — which is the expected case, since their presence on an
 * authenticated 200 is documented in prose but was never observable without a
 * token. `unknown` outranks `ok` in the roll-up, so at any severity but
 * `informational` that expected case would pin the app at `unknown` forever.
 */
Deno.test("index: the quota check is informational, because its unknown case is expected", () => {
  const q = app.healthChecks.find((h) => h.key === "quota");
  assert(q, "quota check missing");
  assertEquals(q.severity, "informational");
});

// --- manifest ----------------------------------------------------------------

Deno.test("index: the manifest allows the API host and not the status host", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as {
    w6w: {
      id: string;
      categories: string[];
      network: { allow: string[] };
      appearance: { icon: { svg: string } };
    };
  };
  assertEquals(manifest.w6w.id, "io.w6w.productboard");
  assertEquals(manifest.w6w.network.allow, ["api.productboard.com"]);
  // The status host belongs to the health check's own allowlist, not the app's.
  assert(!manifest.w6w.network.allow.includes("status.productboard.com"));
  // And 127.0.0.1 is not a host this app ever calls.
  assert(!manifest.w6w.network.allow.includes("127.0.0.1"));
  assert(manifest.w6w.categories.length >= 1 && manifest.w6w.categories.length <= 3);
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
});

Deno.test("index: the icon is the vendor's mark, byte-for-byte", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  // Downloaded verbatim from www.productboard.com/favicon.svg on 2026-08-11:
  // 323 bytes, a 32x32 viewBox of three coloured paths.
  assertEquals(svg.length, 323, "icon.svg is no longer the 323-byte vendor file");
  assert(svg.includes('viewBox="0 0 32 32"'));
  for (const colour of ["#0071E1", "#FFC600", "#F84136"]) {
    assert(svg.includes(colour), `vendor colour ${colour} missing — the mark was redrawn`);
  }
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// x-version\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
