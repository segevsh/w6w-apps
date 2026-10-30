import { test } from "node:test";
import { assert, assertEquals } from "./_assert.ts";
import app from "../index.ts";

test("index: exports 20 uniquely-keyed kebab-case actions", () => {
  assertEquals(app.actions.length, 20);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const k of keys) assert(/^[a-z]+(-[a-z]+)+$/.test(k), k);
});

test("index: every action is a complete read", () => {
  for (const a of app.actions) {
    assertEquals(a.type, "read", a.key);
    assert(a.description, `${a.key} description`);
    assert(Array.isArray(a.output) && a.output.length > 0, `${a.key} output`);
    assert(a.resource, `${a.key} resource`);
    assertEquals(typeof a.execute, "function");
  }
});

test("index: no action carries a credential param", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!/token|password|secret|authorization|apikey/i.test(p.key), `${a.key}.${p.key}`);
    }
  }
});

test("index: one apiKey auth and the three health checks", () => {
  assertEquals(app.auth!.map((a) => a.key), ["api-key"]);
  assertEquals(app.auth![0].type, "apiKey");
  assertEquals((app.healthChecks ?? []).map((h) => h.key), ["service", "api", "quota"]);
});
