import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 15;

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth?.length, 1);
  assertEquals(app.healthChecks?.length, 2);
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
  }
});

Deno.test("index: every perform action states idempotency explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
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
 * comment that legitimately names "credential" or "Authorization" (as most
 * of this app's action files do, to explain why the runtime, not the
 * action, injects the header) must not trip these.
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
 * Every API host lives in `lib/client.ts` and nowhere else — an action that
 * hard-coded a host could reach past the manifest's allowlist.
 */
Deno.test("index: no action hard-codes a googleapis.com host", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/googleapis\.com/.test(src), `${a.key}: contains a raw googleapis.com host literal`);
  }
});

Deno.test("index: connection identity is never reachable as an action param", () => {
  const banned = /^(host|origin|domain|base_?url|api_?key|api_?token|token|account)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

// --- auth --------------------------------------------------------------

Deno.test("index: oauth2 is the only auth method and its credential fields (if any) are secret", () => {
  const [method] = app.auth ?? [];
  assertEquals(method.key, "oauth2");
  assertEquals(method.type, "oauth2");
  for (const f of method.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
  assertEquals(typeof method.test, "function");
  assertEquals(typeof method.sign, "function");
});

/**
 * The rejected probe, kept rejected: no whoami on this API echoes the
 * caller's raw OAuth token back in the body, but pinning this stops a future
 * edit from routing the probe through anything that would.
 */
Deno.test("index: nothing in auth or health echoes an access token in a probe path", async () => {
  for (const dir of ["auth", "health"]) {
    for await (const entry of Deno.readDir(new URL(`../${dir}`, import.meta.url))) {
      if (!entry.isFile || !entry.name.endsWith(".ts")) continue;
      const src = code(
        await Deno.readTextFile(new URL(`../${dir}/${entry.name}`, import.meta.url)),
      );
      assert(!/["'`]\/apikey["'`]/i.test(src), `${dir}/${entry.name}: probes an apikey echo route`);
    }
  }
});

// --- health --------------------------------------------------------------

Deno.test("index: every health check is either probing or declared unavailable", () => {
  for (const h of app.healthChecks ?? []) {
    const hasCheck = typeof h.check === "function";
    const hasUnavailable = typeof h.unavailable?.reason === "string";
    assert(hasCheck !== hasUnavailable, `${h.key}: must have exactly one of check/unavailable`);
    assert(typeof h.title === "string" && h.title.length > 0, `${h.key}: no title`);
  }
});

Deno.test("index: every unavailable health check is informational", () => {
  const unavailable = (app.healthChecks ?? []).filter((h) => h.unavailable);
  assert(unavailable.length > 0, "no declared absence — this test would pass vacuously");
  for (const h of unavailable) {
    assertEquals(h.severity, "informational", `${h.key}: unavailable but not informational`);
  }
});

// --- manifest --------------------------------------------------------------

interface Manifest {
  w6w: {
    id: string;
    network: { allow: string[] };
    appearance: { icon: { url: string; alt?: string } };
  };
}

Deno.test("index: the manifest allows exactly the four API hosts this app calls", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as Manifest;
  assertEquals(manifest.w6w.id, "io.w6w.google-business-profile");
  assertEquals(
    manifest.w6w.network.allow.slice().sort(),
    [
      "mybusinessaccountmanagement.googleapis.com",
      "mybusinessbusinessinformation.googleapis.com",
      "mybusinessplaceactions.googleapis.com",
      "mybusinessqanda.googleapis.com",
    ].sort(),
  );
  // OAuth endpoints (accounts.google.com, oauth2.googleapis.com) are allowed
  // implicitly by the host — they must not be restated here.
  assert(!manifest.w6w.network.allow.includes("accounts.google.com"));
  assert(!manifest.w6w.network.allow.includes("oauth2.googleapis.com"));
  assertEquals(manifest.w6w.appearance.icon.url, "./assets/icon.png");
});

/**
 * `assets/icon.png` is the verified verbatim vendor mark (Google's own CDN,
 * `google_my_business_48dp.png`) — pinned by hash so a future edit that
 * regenerates or swaps it fails loudly here rather than shipping silently.
 */
Deno.test("index: the icon is the pinned vendor mark, byte for byte", async () => {
  const bytes = await Deno.readFile(new URL("../assets/icon.png", import.meta.url));
  assertEquals(bytes.byteLength, 4857);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  assertEquals(hex, "a3501128abaa0e8e35dd3da67c6180b887931c0e3dd3195002f469959e4cf3b3");
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
