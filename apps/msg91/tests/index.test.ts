import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";
import pkg from "../package.json" with { type: "json" };

const ACTION_COUNT = 16;

Deno.test("index: exports actions, one auth method and three health checks", () => {
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 1);
  assertEquals(app.auth[0].key, "authkey");
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "api", "quota"]);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const key of keys) assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), key);
});

Deno.test("index: every action has a type, description, resource, output and execute hook", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), a.key);
    assert(a.description && a.description.length > 0, a.key);
    assert(a.resource, a.key);
    assert(Array.isArray(a.output) && a.output.length > 0, a.key);
    assertEquals(typeof a.execute, "function", a.key);
  }
});

Deno.test("index: every param has a key and a label", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) assert(p.key && p.label, `${a.key}: ${JSON.stringify(p.key)}`);
  }
});

Deno.test("index: every perform declares idempotency, and none of the sends is retryable", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(a.idempotent, false, a.key);
  }
  assertEquals(app.actions.filter((a) => a.type === "perform").length, 7);
});

Deno.test("index: manifest declares only control.msg91.com", () => {
  assertEquals(pkg.w6w.network.allow, ["control.msg91.com"]);
  assertEquals(pkg.w6w.categories, ["communication", "marketing"]);
  assertEquals(pkg.w6w.id, "io.w6w.msg91");
});
