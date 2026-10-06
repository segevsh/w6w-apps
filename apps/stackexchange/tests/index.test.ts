import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports 39 uniquely-keyed kebab-case read actions", () => {
  assertEquals(app.actions.length, 39);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const a of app.actions) {
    assert(/^[a-z]+(-[a-z]+)+$/.test(a.key) || a.key === "search", a.key);
    assertEquals(a.type, "read", a.key);
    assert(a.description, `${a.key} description`);
    assert(a.output, `${a.key} output`);
    assert(a.resource, `${a.key} resource`);
    assertEquals(typeof a.execute, "function");
  }
});

Deno.test("index: one apiKey auth and the three health checks", () => {
  assertEquals(app.auth.map((a) => a.key), ["api-key"]);
  assertEquals(app.auth[0].type, "apiKey");
  assertEquals((app.healthChecks ?? []).map((h) => h.key), ["service", "api", "quota"]);
});
