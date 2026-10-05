import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports 31 actions, one auth method and two health checks", () => {
  assertEquals(app.actions.length, 31);
  assertEquals(app.auth.length, 1);
  assertEquals(app.healthChecks.length, 2);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const key of keys) assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
});

Deno.test("index: every action has a type, description, resource, output and execute hook", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type`);
    assert(a.description && a.description.length > 0, `${a.key}: no description`);
    assert(a.resource && a.resource.length > 0, `${a.key}: no resource`);
    assert(Array.isArray(a.output) && a.output.length > 0, `${a.key}: no output`);
    assertEquals(typeof a.execute, "function", `${a.key}: no execute`);
  }
});

Deno.test("index: every perform action states idempotency; reads do not", () => {
  for (const a of app.actions) {
    if (a.type === "perform") assertEquals(typeof a.idempotent, "boolean", `${a.key}`);
    else assertEquals(a.idempotent, undefined, `${a.key}`);
  }
});

Deno.test("index: every param has a key and label, and none is named networkId", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(p.key && p.label, `${a.key}: param missing key/label`);
      assert(p.key !== "networkId", `${a.key}: the Network belongs to the connection`);
    }
  }
});

/** Strip comments so the guards below scan code, not prose. */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

Deno.test("index: no action touches credentials or the global fetch", async () => {
  for (const a of app.actions) {
    const src = code(await Deno.readTextFile(new URL(`../actions/${a.key}.ts`, import.meta.url)));
    assert(!/authorization/i.test(src), `${a.key}: mentions Authorization`);
    assert(!/(^|[^.\w])fetch\(/.test(src), `${a.key}: calls global fetch`);
    assert(!/credential|apiToken/.test(src), `${a.key}: touches the credential`);
  }
});

Deno.test("index: auth is a bearer method with a secret token and a plain Network ID", () => {
  const [auth] = app.auth!;
  assertEquals(auth.key, "api-token");
  const fields = auth.fields ?? [];
  assertEquals(fields.map((f) => [f.key, f.type]), [["networkId", "string"], [
    "apiToken",
    "secret",
  ]]);
});

Deno.test("index: health checks are service and quota, quota declared unavailable", () => {
  const [service, quota] = app.healthChecks!;
  assertEquals(service.kind, "service");
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  assert(quota.unavailable?.reason);
});
