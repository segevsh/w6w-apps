import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 20;

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
 * `POST` (create) actions genuinely mint a new resource on every call, so a
 * runtime retry after a dropped response would create a duplicate.
 */
Deno.test("index: no resource-creating action is marked idempotent", () => {
  for (const key of ["users-create", "enrollments-create", "bundles-enrollment-create"]) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

/**
 * `PUT` (update) and `DELETE` actions converge to the same end state no
 * matter how many times they run with the same input, so marking them
 * idempotent is what lets the runtime recover from a dropped connection.
 */
Deno.test("index: every PUT/DELETE action is marked idempotent", () => {
  for (
    const key of ["users-update", "users-delete", "enrollments-update", "bundles-enrollment-update"]
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

/**
 * Strip comments so the sandbox guards below scan CODE, not prose — a doc
 * comment explaining why an action never touches the credential should not
 * trip its own assertion.
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
    assert(
      !/x-auth-api-key|x-auth-subdomain/i.test(src),
      `${a.key}: touches the auth headers directly`,
    );
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
 * The API origin lives in `lib/client.ts` and nowhere else. In particular, no
 * action ever builds a per-tenant host from `subdomain` — the whole point of
 * `auth/api-key.ts`'s design is that the subdomain is a header value, not a
 * hostname.
 */
Deno.test("index: no action hard-codes a host", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/thinkific\.com/.test(src), `${a.key}: contains a Thinkific host literal`);
    assert(!/https?:\/\//.test(src), `${a.key}: contains an absolute URL`);
  }
});

Deno.test("index: connection identity is never reachable as an action param", () => {
  const banned = /^(host|origin|domain|base_?url|api_?key|api_?token|token|subdomain)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

// --- auth --------------------------------------------------------------

Deno.test("index: the auth probe is GET /courses — the vendor's own documented smoke test", async () => {
  const src = code(await Deno.readTextFile(new URL("../auth/api-key.ts", import.meta.url)));
  assert(src.includes('PROBE_PATH = "/courses"'), "auth probe no longer hits /courses");
});

Deno.test("index: the credential field is declared secret, the subdomain field is not", () => {
  const [method] = app.auth;
  assertEquals(method.key, "api-key");
  assertEquals(method.type, "custom");
  const secretFields = (method.fields ?? []).filter((f) =>
    /key|token|secret|password/i.test(f.key)
  );
  assert(
    secretFields.length > 0,
    "no field looked like a credential — this test would pass vacuously",
  );
  for (const f of secretFields) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
  assertEquals(typeof method.test, "function");
  assertEquals(typeof method.sign, "function");
});

// --- health --------------------------------------------------------------

Deno.test("index: every health check is either probing or declared unavailable", () => {
  for (const h of app.healthChecks) {
    const hasCheck = typeof h.check === "function";
    const hasUnavailable = typeof h.unavailable?.reason === "string";
    assert(hasCheck !== hasUnavailable, `${h.key}: must have exactly one of check/unavailable`);
    assert(typeof h.title === "string" && h.title.length > 0, `${h.key}: no title`);
  }
});

/**
 * An `unavailable` entry always reports `unknown`, and `unknown` outranks `ok`
 * in the roll-up, so at any severity but `informational` a declared absence
 * pins the App at `unknown` forever.
 */
Deno.test("index: every unavailable health check is informational", () => {
  const unavailable = app.healthChecks.filter((h) => h.unavailable);
  assert(unavailable.length > 0, "no declared absence — this test would pass vacuously");
  for (const h of unavailable) {
    assertEquals(h.severity, "informational", `${h.key}: unavailable but not informational`);
  }
});

/** A check that widens egress must be unsigned — a status host never sees the API key. */
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
  ) as { w6w: { id: string; network: { allow: string[] }; appearance: { icon: { url: string } } } };
  assertEquals(manifest.w6w.id, "io.w6w.thinkific");
  assert(manifest.w6w.network.allow.includes("api.thinkific.com"));
  assert(!manifest.w6w.network.allow.includes("status.thinkific.com"));
  assertEquals(manifest.w6w.appearance.icon.url, "./assets/icon.png");
});

Deno.test("index: the icon is the vendor's mark, byte-for-byte", async () => {
  const bytes = await Deno.readFile(new URL("../assets/icon.png", import.meta.url));
  // Downloaded verbatim from thinkific.com/apple-touch-icon.png on 2026-08-15:
  // 180x180, 2333 bytes.
  assertEquals(bytes.length, 2333, "icon.png is no longer the 2333-byte vendor file");
  // PNG signature.
  assertEquals(bytes[0], 0x89);
  assertEquals(bytes[1], 0x50);
});

Deno.test("index: the dark-tile plate embeds the SAME png bytes, not a redraw", async () => {
  const pngBytes = await Deno.readFile(new URL("../assets/icon.png", import.meta.url));
  const svg = await Deno.readTextFile(new URL("../assets/icon.dark.svg", import.meta.url));
  const embedded = /base64,([A-Za-z0-9+/=]+)/.exec(svg)?.[1];
  assert(embedded, "dark plate has no embedded base64 image");
  const decoded = Uint8Array.from(atob(embedded!), (c) => c.charCodeAt(0));
  assertEquals(decoded, pngBytes, "dark plate's embedded image diverged from assets/icon.png");
});

Deno.test("index: the manifest declares the dark plate", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as { w6w: { appearance: { darkMode?: { icon?: { svg?: string } } } } };
  assertEquals(manifest.w6w.appearance.darkMode?.icon?.svg, "./assets/icon.dark.svg");
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
