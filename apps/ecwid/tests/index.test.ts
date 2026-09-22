import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 23;

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
 * The four writes that create or move something, and cannot be replayed safely.
 *
 * The creates mint an id with no client-supplied idempotency key, and
 * `product-stock-adjust` applies a *delta* — running it twice moves stock twice.
 * Marking any of these `true` would turn one transient network error into a
 * second product, a second order or an inventory count that is wrong by one.
 */
Deno.test("index: nothing that creates or moves stock is marked idempotent", () => {
  for (
    const key of [
      "product-create",
      "category-create",
      "order-create",
      "customer-create",
      "discount-coupon-create",
      "product-stock-adjust",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

Deno.test("index: the genuinely replayable writes are marked idempotent", () => {
  for (
    const key of [
      "store-profile-update",
      "product-update",
      "product-delete",
      "category-update",
      "category-delete",
      "order-update",
      "customer-update",
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

Deno.test("index: every search action exposes offset and limit", () => {
  for (const a of app.actions.filter((a) => a.type === "search")) {
    const keys = (a.params ?? []).map((p) => p.key);
    assert(keys.includes("limit"), `${a.key}: no limit`);
    assert(keys.includes("offset"), `${a.key}: no offset`);
    const limit = (a.params ?? []).find((p) => p.key === "limit");
    // Never the vendor's own maximum: Ecwid's default limit IS its maximum.
    assert(
      typeof limit?.default === "number" && limit.default < 100,
      `${a.key}: limit default ${limit?.default}`,
    );
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

/**
 * Strip user-facing prose too, as the pack's own auditor does: a `hint:` that
 * shows the shape of a body field (`{"storeUrl":"https://acme.example"}`) is
 * documentation, not a request this app makes.
 */
function codeOnly(src: string): string {
  return code(src).replace(
    /\b(?:hint|description|placeholder|label|title|subtitle):\s*(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)(?:\s*\+\s*(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`))*/g,
    "",
  );
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
 * The API origin lives in `lib/client.ts` and nowhere else, and the store id
 * lives in the credential — never in a param an editor could point somewhere
 * the manifest never allowlisted.
 */
Deno.test("index: no action hard-codes a host", async () => {
  for (const a of app.actions) {
    const src = codeOnly(
      await Deno.readTextFile(new URL(`../actions/${a.key}.ts`, import.meta.url)),
    );
    assert(!/ecwid\.com/.test(src), `${a.key}: contains the Ecwid host`);
    assert(!/https?:\/\//.test(src), `${a.key}: contains an absolute URL`);
  }
});

Deno.test("index: connection identity is never reachable as an action param", () => {
  const banned =
    /^(host|origin|domain|base_?url|api_?key|api_?token|token|account|store|store_?id)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

// --- health surface --------------------------------------------------------

Deno.test("index: every health check has exactly one of check/unavailable", () => {
  for (const h of app.healthChecks) {
    const hasCheck = typeof h.check === "function";
    const hasUnavailable = typeof h.unavailable?.reason === "string";
    assert(hasCheck !== hasUnavailable, `${h.key}: must have exactly one of check/unavailable`);
    assert(typeof h.title === "string" && h.title.length > 0, `${h.key}: no title`);
  }
});

/**
 * An `unavailable` entry always reports `unknown`, and `unknown` outranks `ok`
 * in the roll-up, so at any severity but `informational` a declared absence pins
 * the app at `unknown` forever.
 */
Deno.test("index: every unavailable health check is informational", () => {
  const unavailable = app.healthChecks.filter((h) => h.unavailable);
  assert(unavailable.length > 0, "no declared absence — this test would pass vacuously");
  for (const h of unavailable) {
    assertEquals(h.severity, "informational", `${h.key}: unavailable but not informational`);
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

// --- manifest --------------------------------------------------------------

Deno.test("index: the manifest allows the API host and not the status host", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as { w6w: { id: string; network: { allow: string[] }; appearance: { icon: { svg: string } } } };
  assertEquals(manifest.w6w.id, "io.w6w.ecwid");
  assertEquals(manifest.w6w.network.allow, ["app.ecwid.com"]);
  // The status host belongs to the health check's own allowlist, not the app's.
  assert(!manifest.w6w.network.allow.includes("status.ecwid.com"));
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
});

Deno.test("index: the icon is the vendor's real mark, wrapped as a PNG data URI", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  // Downloaded verbatim from ecwid.com/favicons/android-chrome-192x192.png on
  // 2026-09-22: 3,077 bytes, a 192x192 PNG. Ecwid publishes no SVG mark, so —
  // like the 36 other apps in this pack with a PNG-only mark — the real raster is
  // carried inside a minimal SVG rather than redrawn.
  assert(svg.includes('viewBox="0 0 192 192"'), "icon.svg is not sized to the vendor's PNG");
  assert(svg.includes('aria-label="Ecwid"'), "icon.svg lost its label");

  const b64 = /base64,([A-Za-z0-9+/=]+)"/.exec(svg)?.[1];
  assert(b64, "icon.svg carries no base64 raster");
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  assertEquals(bytes.length, 3077, "the embedded PNG is not the vendor's file");
  assertEquals(String.fromCharCode(...bytes.slice(1, 4)), "PNG");
  const view = new DataView(bytes.buffer);
  assertEquals(view.getUint32(16), 192, "embedded PNG width");
  assertEquals(view.getUint32(20), 192, "embedded PNG height");
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
  // And prose about a body shape is not a request this app makes.
  assert(!codeOnly('hint: "see https://acme.example"').includes("acme.example"));
});
