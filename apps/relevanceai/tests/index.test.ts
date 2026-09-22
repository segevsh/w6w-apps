import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 12;
const HEALTH_CHECK_COUNT = 3;

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 1);
  assertEquals(app.healthChecks.length, HEALTH_CHECK_COUNT);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const key of keys) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
  }
  assertEquals(keys, [
    "agent-trigger",
    "agent-get",
    "agent-list",
    "agent-run-cancel",
    "conversation-list",
    "tool-trigger",
    "tool-trigger-async",
    "tool-job-poll",
    "tool-job-cancel",
    "tool-get",
    "tool-list",
    "auth-info-get",
  ]);
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
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
});

/**
 * Relevance AI's trigger inputs expose no idempotency key — the agent trigger's
 * `external_id` names a conversation rather than deduplicating a request — so a
 * retry starts and bills a second run. Marking any of these `true` would turn one
 * transient network error into two agent runs.
 */
Deno.test("index: no run-starting action is marked idempotent", () => {
  for (const key of ["agent-trigger", "tool-trigger", "tool-trigger-async"]) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

/**
 * The converse: cancelling something already cancelled is not a second side
 * effect, and saying so is what lets the runtime recover from a dropped
 * connection instead of failing the step.
 */
Deno.test("index: both cancels are marked idempotent", () => {
  for (const key of ["agent-run-cancel", "tool-job-cancel"]) {
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
    assert(!/authorization/i.test(src), `${a.key}: sets the auth header itself`);
    assert(!/\bbearer\b/i.test(src), `${a.key}: builds a bearer token`);
    assert(!/api[_-]?key/i.test(src), `${a.key}: touches an API key`);
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
 * The API origin lives in `lib/client.ts` and nowhere else — and it is not even
 * a constant there, because the host is built from the Connection's region id.
 * An action that hard-coded a host, or accepted one as a param, could be pointed
 * somewhere the manifest never allowlisted.
 */
Deno.test("index: no action hard-codes a host", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/tryrelevance/.test(src), `${a.key}: contains a Relevance AI host literal`);
    assert(!/https?:\/\//.test(src), `${a.key}: contains an absolute URL`);
  }
});

Deno.test("index: connection identity is never reachable as an action param", () => {
  const banned = /^(host|origin|domain|base_?url|api_?key|api_?token|token|account|region)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

// --- health checks -----------------------------------------------------------

Deno.test("index: every health check is either probing or declared unavailable", () => {
  const keys = app.healthChecks.map((h) => h.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate health-check key");
  for (const h of app.healthChecks) {
    const hasCheck = typeof h.check === "function";
    const hasUnavailable = typeof h.unavailable?.reason === "string";
    assert(hasCheck !== hasUnavailable, `${h.key}: must have exactly one of check/unavailable`);
    assert(typeof h.title === "string" && h.title.length > 0, `${h.key}: no title`);
    assert(
      typeof h.description === "string" && h.description.length > 0,
      `${h.key}: no description`,
    );
  }
});

/**
 * An `unavailable` entry always reports `unknown`, and `unknown` outranks `ok`
 * in the roll-up, so at any severity but `informational` a declared absence pins
 * the App at `unknown` forever.
 */
Deno.test("index: the declared absence is informational", () => {
  const unavailable = app.healthChecks.filter((h) => h.unavailable);
  assertEquals(unavailable.length, 1);
  for (const h of unavailable) {
    assertEquals(h.severity, "informational", `${h.key}: unavailable but not informational`);
  }
});

/** A check that widens egress must be unsigned — a status host never sees the key. */
Deno.test("index: the egress-widening health check is unsigned", () => {
  const widening = app.healthChecks.filter((h) => h.network?.allow?.length);
  assertEquals(widening.length, 1);
  for (const h of widening) {
    assert(
      h.credential === "none" || h.credential === "context",
      `${h.key}: widens egress while signed`,
    );
  }
});

/** Every action has a test file, which is what the pack's audit warns about when missing. */
Deno.test("index: every action has a unit test", async () => {
  for (const a of app.actions) {
    const stat = await Deno.stat(
      new URL(`./actions/${a.key}.test.ts`, import.meta.url),
    ).catch(() => null);
    assert(stat?.isFile, `no test for ${a.key}`);
  }
});

// --- manifest --------------------------------------------------------------

Deno.test("index: the manifest allows the API wildcard and not the status host", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as {
    name: string;
    w6w: {
      id: string;
      network: { allow: string[] };
      appearance: { icon: { url: string; alt: string } };
    };
  };
  assertEquals(manifest.name, "@w6w-apps/relevanceai");
  assertEquals(manifest.w6w.id, "io.w6w.relevanceai");
  // The host is per-organization, so the wildcard is the only honest entry —
  // and it must never be narrowed to one of the three documented region hosts.
  assertEquals(manifest.w6w.network.allow, ["*.stack.tryrelevance.com"]);
  // The status host belongs to the health check's own allowlist, not the app's.
  assertEquals(manifest.w6w.network.allow.includes("status.relevanceai.com"), false);
  assertEquals(manifest.w6w.appearance.icon.url, "./assets/icon.png");
  assertEquals(manifest.w6w.appearance.icon.alt, "Relevance AI");
});

Deno.test("index: the icon is the vendor's own raster mark, byte for byte", async () => {
  const bytes = await Deno.readFile(new URL("../assets/icon.png", import.meta.url));
  // Downloaded verbatim from
  // https://cdn.relevanceai.com/images/favicon-256x256.png on 2026-09-22
  // (HTTP 200, image/png, 3,874 bytes, md5 bdc359b02ae429fd4b118491e2cf04bf),
  // which is the mark relevanceai.com serves from its own
  // `<link rel="apple-touch-icon">`. Nothing here redraws it.
  assertEquals(bytes.length, 3874);
  assertEquals([...bytes.slice(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  assertEquals(view.getUint32(16), 256);
  assertEquals(view.getUint32(20), 256);
  // RGBA, non-interlaced — the shape the icon legibility audit can decode.
  assertEquals(bytes[24], 8);
  assertEquals(bytes[25], 6);
  assertEquals(bytes[28], 0);
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
