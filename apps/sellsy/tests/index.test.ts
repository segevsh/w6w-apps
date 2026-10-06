import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";
import pkg from "../package.json" with { type: "json" };

Deno.test("index: exports actions, two auth methods and two health checks", () => {
  assertEquals(app.actions.length, 39);
  assertEquals(app.auth.map((a) => a.key), ["client-credentials", "oauth2"]);
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "quota"]);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const k of keys) assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(k), k);
});

Deno.test("index: every action has a valid type, description, output and execute", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), a.key);
    assert(a.description && a.description.length > 0, a.key);
    assert(Array.isArray(a.output) && a.output.length > 0, a.key);
    assertEquals(typeof a.execute, "function", a.key);
  }
});

Deno.test("index: every perform declares idempotency, creates never claim it", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", a.key);
    if (a.key.endsWith("-create")) assertEquals(a.idempotent, false, a.key);
  }
});

Deno.test("index: every param has a key and label; required params are marked", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) assert(p.key && p.label, `${a.key}/${p.key}`);
  }
  const create = app.actions.find((a) => a.key === "company-create")!;
  assertEquals(create.params!.filter((p) => p.required).map((p) => p.key), ["name", "type"]);
});

Deno.test("index: network.allow lists only the API host", () => {
  assertEquals(pkg.w6w.network.allow, ["api.sellsy.com"]);
});

Deno.test("index: health checks declare their severity/credential posture", () => {
  const quota = app.healthChecks.find((h) => h.key === "quota")!;
  assertEquals(quota.severity, "informational");
  assertEquals(quota.credential, "signed");
});
