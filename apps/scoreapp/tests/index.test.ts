import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 6;

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 1);
  assertEquals(app.healthChecks.length, 2);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);

  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const key of keys) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
  }
});

/**
 * The vendor's Open API is read-only: no create, update or delete of scorecards or
 * results is documented, so nothing here may be a `perform`.
 */
Deno.test("index: every action is a read or a search, and declares output", () => {
  for (const a of app.actions) {
    assert(["read", "search"].includes(a.type), `${a.key}: type ${a.type}`);
    assert(
      typeof a.description === "string" && a.description.length > 0,
      `${a.key}: no description`,
    );
    assertEquals(typeof a.execute, "function", `${a.key}: no execute`);
    assert(Array.isArray(a.output), `${a.key}: no output`);
    assertEquals(a.healthCheck, undefined, `${a.key}: tagged as a health check`);
  }
});

Deno.test("index: no action is marked idempotent because none writes", () => {
  for (const a of app.actions) {
    assertEquals(a.idempotent, undefined, `${a.key}: idempotent is a perform-only field`);
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

/** A connection's identity must never be reachable as an action param. */
Deno.test("index: no param accepts a host, a token or an api key", () => {
  const banned = /^(host|origin|domain|base_?url|api_?key|api_?token|token|account)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

/**
 * Strip comments so the sandbox guards below scan CODE, not prose.
 *
 * Without this a doc comment explaining *why* an action never touches the
 * credential would trip the assertion, and the natural fix — deleting the
 * explanation — would leave a real violation just as invisible.
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

Deno.test("index: every action goes through the one client, and hard-codes no host", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(/new ScoreAppClient\(ctx\)/.test(src), `${a.key}: does not use the shared client`);
    assert(!/scoreapp\.com/.test(src), `${a.key}: contains a ScoreApp host literal`);
    assert(!/https?:\/\//.test(src), `${a.key}: contains an absolute URL`);
  }
});

/**
 * Every documented path is under `/scorecards`, and the two ids that appear in
 * them are never coerced: no action may run a `Number(`/`parseInt(` over an id.
 */
Deno.test("index: path ids stay opaque strings", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/parseInt|Number\(/.test(src), `${a.key}: coerces an id to a number`);
    assert(
      !/typeof\s+\w+(\.\w+)?\s*===\s*"number"/.test(src),
      `${a.key}: type-checks an id as numeric`,
    );
  }
});

// --- health checks -----------------------------------------------------------

Deno.test("index: every health check either probes or declares an absence, never both", () => {
  for (const h of app.healthChecks) {
    const hasCheck = typeof h.check === "function";
    const hasUnavailable = typeof h.unavailable?.reason === "string";

    assert(hasCheck !== hasUnavailable, `${h.key}: must have exactly one of check/unavailable`);
    assert(typeof h.title === "string" && h.title.length > 0, `${h.key}: no title`);
  }
});

/**
 * An `unavailable` entry always reports `unknown`, and `unknown` outranks `ok` in
 * the roll-up, so at any severity but `informational` a declared absence pins the
 * App at `unknown` forever.
 */
Deno.test("index: every unavailable health check is informational", () => {
  const unavailable = app.healthChecks.filter((h) => h.unavailable);

  assert(unavailable.length > 0, "no declared absence — this test would pass vacuously");
  for (const h of unavailable) {
    assertEquals(h.severity, "informational", `${h.key}: unavailable but not informational`);
  }
});

/** ScoreApp does read real rate-limit headers, so `quota` is a probe, not an absence. */
Deno.test("index: quota is a real signed probe, and service is the absence", () => {
  const byKey = Object.fromEntries(app.healthChecks.map((h) => [h.key, h]));

  assertEquals(byKey.service.unavailable !== undefined, true);
  assertEquals(byKey["rate-limit"].kind, "quota");
  assertEquals(byKey["rate-limit"].credential, "signed");
  assertEquals(typeof byKey["rate-limit"].check, "function");
  assertEquals(byKey["rate-limit"].unavailable, undefined);
});

/** There is no status host to allow: the absence means no extra egress. */
Deno.test("index: no health check widens egress", () => {
  for (const h of app.healthChecks) {
    assertEquals(h.network, undefined, `${h.key}: declares extra egress`);
    assertEquals(h.feed, undefined, `${h.key}: declares a status feed`);
  }
});

// --- manifest ----------------------------------------------------------------

interface Manifest {
  w6w: {
    id: string;
    categories: string[];
    network: { allow: string[] };
    appearance: { icon: { url?: string; svg?: string; alt?: string } };
  };
}

const manifest = async (): Promise<Manifest> =>
  JSON.parse(await Deno.readTextFile(new URL("../package.json", import.meta.url))) as Manifest;

Deno.test("index: the manifest allows the API host and nothing else", async () => {
  const m = await manifest();

  assertEquals(m.w6w.id, "io.w6w.scoreapp");
  // There is no status host to add: ScoreApp publishes no status page.
  assertEquals(m.w6w.network.allow, ["open-api.scoreapp.com"]);
  assert(!m.w6w.network.allow.some((h) => /status/i.test(h)));
});

Deno.test("index: the manifest declares 1-3 in-vocabulary categories", async () => {
  const m = await manifest();

  assert(m.w6w.categories.length >= 1 && m.w6w.categories.length <= 3);
  assertEquals(m.w6w.categories[0], "forms");
});

Deno.test("index: the icon is the vendor's own PNG mark", async () => {
  const m = await manifest();

  assertEquals(m.w6w.appearance.icon.url, "./assets/icon.png");
  assertEquals(m.w6w.appearance.icon.svg, undefined);
  assertEquals(m.w6w.appearance.icon.alt, "ScoreApp");

  // Downloaded verbatim from cdn.scoreapp.com (ScoreApp's own
  // `<link rel="apple-touch-icon">`, linked from www.scoreapp.com's own head).
  const bytes = await Deno.readFile(new URL("../assets/icon.png", import.meta.url));
  assertEquals([...bytes.slice(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  assertEquals(view.getUint32(16), 270, "width");
  assertEquals(view.getUint32(20), 270, "height");
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
