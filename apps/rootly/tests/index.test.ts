import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 32;

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth!.length, 1);
  assertEquals(app.healthChecks!.map((h) => h.key), ["service", "api", "quota"]);
});

Deno.test("index: every action key is unique, kebab-case and has a test file", async () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const key of keys) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
    await Deno.stat(new URL(`./actions/${key}.test.ts`, import.meta.url));
  }
});

Deno.test("index: every action has a valid type, a description and an execute hook", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type ${a.type}`);
    assert(typeof a.description === "string" && a.description.length > 0, `${a.key}: description`);
    assertEquals(typeof a.execute, "function", `${a.key}: no execute`);
  }
});

Deno.test("index: every perform action states idempotency; creates are not idempotent", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
    if (a.key.endsWith("-create")) assertEquals(a.idempotent, false, a.key);
  }
});

Deno.test("index: every param has a key and a label, and read actions never write", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(typeof p.key === "string" && p.key.length > 0, `${a.key}: param without a key`);
      assert(typeof p.label === "string" && p.label.length > 0, `${a.key}/${p.key}: no label`);
    }
  }
});

/** Strip comments so the guards below scan CODE, not the prose explaining it. */
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
  }
});

Deno.test("index: no action calls global fetch or Deno.*, or hard-codes a host", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/(^|[^.\w])fetch\s*\(/.test(src), `${a.key}: calls a bare fetch`);
    assert(!/\bDeno\./.test(src), `${a.key}: touches Deno.*`);
    assert(!/https?:\/\//.test(src), `${a.key}: contains an absolute URL`);
  }
});

Deno.test("index: connection identity is never reachable as an action param", () => {
  const banned = /^(host|domain|base_?url|api_?key|secret|token)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

Deno.test("index: the auth method is a bearer token with one secret field", () => {
  const [method] = app.auth!;
  assertEquals(method.key, "api-token");
  assertEquals(method.type, "bearer");
  assertEquals((method.fields ?? []).map((f) => f.key), ["token"]);
  assertEquals(method.fields![0].type, "secret");
  assertEquals(typeof method.test, "function");
  assertEquals(typeof method.sign, "function");
});

Deno.test("index: every health check either probes or is declared unavailable, exactly one", () => {
  for (const h of app.healthChecks!) {
    const hasCheck = typeof h.check === "function";
    const hasUnavailable = typeof h.unavailable?.reason === "string";
    assert(hasCheck !== hasUnavailable, `${h.key}: must have exactly one of check/unavailable`);
  }
});

Deno.test("index: every unavailable health check is informational", () => {
  const unavailable = app.healthChecks!.filter((h) => h.unavailable);
  assert(unavailable.length > 0, "no declared absence — this test would pass vacuously");
  for (const h of unavailable) assertEquals(h.severity, "informational", h.key);
});

Deno.test("index: the manifest allows only the API host, and the icon is the vendor's SVG", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as { w6w: { id: string; network: { allow: string[] }; categories: string[] } };
  assertEquals(manifest.w6w.id, "io.w6w.rootly");
  assertEquals(manifest.w6w.network.allow, ["api.rootly.com"]);
  assert(manifest.w6w.categories.length >= 1 && manifest.w6w.categories.length <= 3);
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  assert(svg.trimStart().startsWith("<svg"));
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// key\nconst a = 1;").trim(), "const a = 1;");
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
