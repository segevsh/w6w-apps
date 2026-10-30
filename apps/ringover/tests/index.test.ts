import { test } from "node:test";
import { assert, assertEquals } from "./_assert.ts";
import app from "../index.ts";

test("index: exports 30 uniquely-keyed kebab-case actions", () => {
  assertEquals(app.actions.length, 30);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const k of keys) assert(/^[a-z]+(-[a-z]+)+$/.test(k), k);
});

test("index: every action is complete; creates and sends are not idempotent", () => {
  for (const a of app.actions) {
    assert(a.type, `${a.key} type`);
    assert(a.description, `${a.key} description`);
    assert(a.output, `${a.key} output`);
    assert(a.resource, `${a.key} resource`);
    assertEquals(typeof a.execute, "function");
    if (a.type === "perform") assertEquals(typeof a.idempotent, "boolean", a.key);
    if (/-(create|send)$/.test(a.key) || a.key === "contact-number-add") {
      assertEquals(a.idempotent, false, a.key);
    }
  }
});

test("index: one apiKey auth and the three health checks", () => {
  assertEquals(app.auth.map((a) => a.key), ["api-key"]);
  assertEquals(app.auth[0].type, "apiKey");
  assertEquals((app.healthChecks ?? []).map((h) => h.key), ["service", "api", "quota"]);
});
