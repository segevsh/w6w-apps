import { denoReadFile, denoReadTextFile } from "./_deno.ts";
import { test } from "node:test";
import { assert, assertEquals } from "./_assert.ts";
import app from "../index.ts";

const ACTION_COUNT = 33;

test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth!.length, 1);
  assertEquals(app.healthChecks!.length, 2);
});

test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const key of keys) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
  }
});

test("index: every action declares a valid type, a description and an execute hook", () => {
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

test("index: every perform action states idempotency explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
});

/**
 * Actions that move money or create a new resource with no documented
 * dedup key. Retrying one of these is not guaranteed safe — see each
 * action's own doc comment for the vendor evidence.
 */
test("index: money-moving and resource-creating actions are not idempotent", () => {
  for (
    const key of [
      "transaction-refund",
      "affiliate-create",
      "student-create",
      "webhook-subscribe",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

test("index: every param has a key and a label", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(typeof p.key === "string" && p.key.length > 0, `${a.key}: param without a key`);
      assert(typeof p.label === "string" && p.label.length > 0, `${a.key}/${p.key}: no label`);
    }
  }
});

/**
 * Strip comments so the sandbox guards below scan CODE, not prose — several
 * doc comments in this app discuss `credential`/`Authorization` by name when
 * explaining why an action does NOT touch them.
 */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const actionSource = async (key: string) =>
  code(await denoReadTextFile(new URL(`../actions/${key}.ts`, import.meta.url)));

test("index: no action reads a credential — signing is the auth hook's job", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/credential/i.test(src), `${a.key}: references a credential`);
    assert(!/authorization/i.test(src), `${a.key}: sets the auth header itself`);
    assert(!/\bbearer\b/i.test(src), `${a.key}: builds a bearer token`);
  }
});

test("index: no action calls global fetch or touches Deno.*", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/(^|[^.\w])fetch\s*\(/.test(src), `${a.key}: calls a bare fetch`);
    assert(!/\bDeno\./.test(src), `${a.key}: touches Deno.*`);
  }
});

/**
 * The API origin lives in `lib/client.ts` and nowhere else. An action that
 * hard-coded a host — or accepted one as a param — could be pointed
 * somewhere the manifest never allowlisted.
 */
test("index: no action hard-codes a host", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/thrivecart\.com/.test(src), `${a.key}: contains a ThriveCart host literal`);
    assert(!/https?:\/\//.test(src), `${a.key}: contains an absolute URL`);
  }
});

test("index: connection identity is never reachable as an action param", () => {
  const banned = /^(host|origin|domain|base_?url|api_?key|api_?token|token|account)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

// --- auth --------------------------------------------------------------

/**
 * The credential-liveness probe is pinned to /ping. Choosing it right
 * matters — see `auth/api-token.ts` for why the collection's own documented
 * 401 shape is not the one a real bad credential produces.
 */
test("index: the auth probe is GET /ping", async () => {
  const src = code(await denoReadTextFile(new URL("../auth/api-token.ts", import.meta.url)));
  assert(src.includes('"/ping"'), "auth probe no longer hits /ping");
});

test("index: the credential field is declared secret", () => {
  const [method] = app.auth!;
  assertEquals(method.key, "api-token");
  assertEquals(method.type, "bearer");
  for (const f of method.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
  assertEquals(typeof method.test, "function");
  assertEquals(typeof method.sign, "function");
});

// --- health --------------------------------------------------------------

test("index: every health check is either probing or declared unavailable", () => {
  for (const h of app.healthChecks!) {
    const hasCheck = typeof h.check === "function";
    const hasUnavailable = typeof h.unavailable?.reason === "string";
    assert(hasCheck !== hasUnavailable, `${h.key}: must have exactly one of check/unavailable`);
    assert(typeof h.title === "string" && h.title.length > 0, `${h.key}: no title`);
  }
});

/**
 * An `unavailable` entry always reports `unknown`, and `unknown` outranks
 * `ok` in the roll-up, so at any severity but `informational` a declared
 * absence pins the App at `unknown` forever.
 */
test("index: every unavailable health check is informational", () => {
  const unavailable = app.healthChecks!.filter((h) => h.unavailable);
  assert(unavailable.length > 0, "no declared absence — this test would pass vacuously");
  for (const h of unavailable) {
    assertEquals(h.severity, "informational", `${h.key}: unavailable but not informational`);
  }
});

// --- manifest --------------------------------------------------------------

test("index: the manifest allows the API host and not a status host", async () => {
  const manifest = JSON.parse(
    await denoReadTextFile(new URL("../package.json", import.meta.url)),
  ) as {
    w6w: {
      id: string;
      network: { allow: string[] };
      appearance: { icon: { url: string; alt?: string } };
    };
  };
  assertEquals(manifest.w6w.id, "io.w6w.thrivecart");
  assertEquals(manifest.w6w.network.allow, ["thrivecart.com"]);
  assert(!manifest.w6w.network.allow.some((h) => h.startsWith("status.")));
  assert(!manifest.w6w.network.allow.includes("api.thrivecart.com"));
  assertEquals(manifest.w6w.appearance.icon.url, "./assets/icon.png");
});

test("index: the icon is the vendor's mark, exactly the placed 32x32 PNG", async () => {
  const bytes = await denoReadFile(new URL("../assets/icon.png", import.meta.url));
  // PNG signature + IHDR carrying width=32, height=32.
  assertEquals(bytes.length, 811, "icon.png is no longer the byte-exact file that was placed");
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  assert(isPng, "not a PNG file");
  const width = new DataView(bytes.buffer, bytes.byteOffset).getUint32(16);
  const height = new DataView(bytes.buffer, bytes.byteOffset).getUint32(20);
  assertEquals(width, 32);
  assertEquals(height, 32);
});

test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
