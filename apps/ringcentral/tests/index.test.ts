import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 13;

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 2);
  assertEquals(app.healthChecks.length, 3);
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
 * Neither `sms-send` nor `ring-out-create` documents any idempotency key.
 * Marking either `true` would let the runtime retry a transient network error
 * by sending a second text / placing a second call.
 */
Deno.test("index: sms-send and ring-out-create are not idempotent", () => {
  for (const key of ["sms-send", "ring-out-create"]) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
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
    assert(!/client[_-]?secret/i.test(src), `${a.key}: touches a client secret`);
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
    assert(!/ringcentral\.com/.test(src), `${a.key}: contains a RingCentral host literal`);
    assert(!/https?:\/\//.test(src), `${a.key}: contains an absolute URL`);
  }
});

/**
 * `accountId`/`extensionId` ARE legitimate action params in this app (they
 * address a resource — "whose call log", "whose mailbox" — not a connection's
 * network identity), so only credential-shaped names are banned here.
 */
Deno.test("index: no credential material is reachable as an action param", () => {
  const banned = /^(client[_-]?id|client[_-]?secret|jwt[_-]?token|access[_-]?token|token)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: credential material leaked into params`);
    }
  }
});

// --- auth ------------------------------------------------------------------

Deno.test("index: both auth methods declare test and sign, and secret fields", () => {
  assertEquals(app.auth.map((m) => m.key).sort(), ["jwt-bearer", "oauth2"]);
  for (const method of app.auth) {
    assertEquals(typeof method.test, "function", `${method.key}: no test hook`);
    assertEquals(typeof method.sign, "function", `${method.key}: no sign hook`);
    for (const f of method.fields ?? []) {
      assertEquals(
        f.type,
        "secret",
        `${method.key}/${f.key}: credential field is not type "secret"`,
      );
    }
  }
});

Deno.test("index: oauth2 declares only the OAuth scopes this app's actions actually need", () => {
  const oauth2 = app.auth.find((m) => m.key === "oauth2")!;
  assertEquals(
    oauth2.oauth2?.scopes,
    ["ReadAccounts", "SMS", "ReadMessages", "ReadCallLog", "ReadPresence", "RingOut"],
  );
});

Deno.test("index: jwt-bearer is a custom-type, no-browser-round-trip method", () => {
  const jwtBearer = app.auth.find((m) => m.key === "jwt-bearer")!;
  assertEquals(jwtBearer.type, "custom");
  assertEquals(typeof jwtBearer.exchange, "function");
  assertEquals(typeof jwtBearer.refresh, "function");
});

// --- health ------------------------------------------------------------------

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

Deno.test("index: the reachability check is unsigned and adds no egress", () => {
  const api = app.healthChecks.find((h) => h.key === "api")!;
  assertEquals(api.credential, "none");
  assertEquals(api.network, undefined);
  assertEquals(typeof api.check, "function");
});

// --- manifest ----------------------------------------------------------------

Deno.test("index: the manifest allows the API host and not the status host", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as { w6w: { id: string; network: { allow: string[] }; appearance: { icon: { url: string } } } };
  assertEquals(manifest.w6w.id, "io.w6w.ringcentral");
  assertEquals(manifest.w6w.network.allow, ["platform.ringcentral.com"]);
  assert(!manifest.w6w.network.allow.includes("status.ringcentral.com"));
  assertEquals(manifest.w6w.appearance.icon.url, "./assets/icon.png");
});

Deno.test("index: the icon is the verified vendor mark, byte-for-byte", async () => {
  const bytes = await Deno.readFile(new URL("../assets/icon.png", import.meta.url));
  // Verified verbatim vendor mark, extracted pixel-exact from
  // https://app.ringcentral.com/favicon.ico on 2026-08-15 — 64x64 PNG, 1,133 bytes.
  assertEquals(bytes.length, 1133, "icon.png is no longer the 1,133-byte verified vendor file");
  // PNG signature + IHDR carrying 64x64 dimensions (big-endian 0x00000040 twice).
  assertEquals([...bytes.slice(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assertEquals([...bytes.slice(16, 24)], [0, 0, 0, 64, 0, 0, 0, 64]);
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
