import { denoReadTextFile } from "./_deno.ts";
import { test } from "node:test";
import { assert, assertEquals } from "./_assert.ts";
import app from "../index.ts";

const ACTION_COUNT = 20;

test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth?.length, 1);
  assertEquals(app.healthChecks?.length, 2);
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

/** POST creates without a dedupe key are never safe to retry blindly. */
test("index: the two POST-create actions are not marked idempotent", () => {
  for (const key of ["lead-create", "leads-list-create"]) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

/** PUT-shaped and delete-by-id operations are safe to retry. */
test("index: PUT/DELETE lead and leads-list actions are marked idempotent", () => {
  for (
    const key of [
      "lead-upsert",
      "lead-update",
      "lead-delete",
      "leads-list-update",
      "leads-list-delete",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, true, key);
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

/** Strip comments so the sandbox guards below scan code, not prose. */
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
    assert(!/\bapi_key\b/.test(src), `${a.key}: builds the api_key param itself`);
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
 * The API origin lives in `lib/client.ts` and nowhere else.
 *
 * This only bans an ABSOLUTE URL — not the bare substring "hunter.io", which
 * legitimately appears in a handful of `placeholder` example values copied
 * verbatim from Hunter's own docs (`matt@hunter.io`, a bare `hunter.io`
 * domain example). A placeholder string is documentation, not a fetch
 * target; an absolute `http(s)://` literal would be.
 */
test("index: no action hard-codes an absolute URL", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/https?:\/\//.test(src), `${a.key}: contains an absolute URL`);
  }
});

test("index: connection identity is never reachable as an action param", () => {
  const banned = /^(host|origin|domain_?url|base_?url|api_?key|token|account)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

test("index: the auth probe is /account, not a call that echoes the credential", async () => {
  const src = code(await denoReadTextFile(new URL("../auth/api-key.ts", import.meta.url)));
  assert(src.includes("/account"), "auth probe no longer hits /account");
});

test("index: the credential field is declared secret", () => {
  const [method] = app.auth ?? [];
  assertEquals(method.key, "api-key");
  assertEquals(method.type, "apiKey");
  for (const f of method.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
  assertEquals(typeof method.test, "function");
  assertEquals(typeof method.sign, "function");
});

// --- health ------------------------------------------------------------------

test("index: every health check is either probing or declared unavailable", () => {
  for (const h of app.healthChecks ?? []) {
    const hasCheck = typeof h.check === "function";
    const hasUnavailable = typeof h.unavailable?.reason === "string";
    assert(hasCheck !== hasUnavailable, `${h.key}: must have exactly one of check/unavailable`);
    assert(typeof h.title === "string" && h.title.length > 0, `${h.key}: no title`);
  }
});

/**
 * An `unavailable` entry always reports `unknown`, and `unknown` outranks
 * `ok` in the roll-up, so at any severity but `informational` a declared
 * absence pins the App's verdict at `unknown` forever.
 */
test("index: every unavailable health check is informational", () => {
  const unavailable = (app.healthChecks ?? []).filter((h) => h.unavailable);
  assert(unavailable.length > 0, "no declared absence — this test would pass vacuously");
  for (const h of unavailable) {
    assertEquals(h.severity, "informational", `${h.key}: unavailable but not informational`);
  }
});

// --- manifest ----------------------------------------------------------------

test("index: the manifest allows the API host and not the status host", async () => {
  const manifest = JSON.parse(
    await denoReadTextFile(new URL("../package.json", import.meta.url)),
  ) as { w6w: { id: string; network: { allow: string[] }; appearance: { icon: { svg: string } } } };
  assertEquals(manifest.w6w.id, "io.w6w.hunter");
  assert(manifest.w6w.network.allow.includes("api.hunter.io"));
  assert(!manifest.w6w.network.allow.includes("status.hunter.io"));
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
});

test("index: the icon file exists and is a well-formed SVG", async () => {
  const svg = await denoReadTextFile(new URL("../assets/icon.svg", import.meta.url));
  assert(svg.startsWith("<svg"), "icon.svg does not start with an <svg> tag");
  assert(svg.includes("</svg>"), "icon.svg is not closed");
});

test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api_key\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
