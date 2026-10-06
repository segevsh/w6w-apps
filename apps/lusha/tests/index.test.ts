import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports 24 uniquely-keyed kebab-case actions", () => {
  assertEquals(app.actions.length, 24);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const k of keys) assert(/^[a-z]+(-[a-z]+)+$/.test(k), k);
});

Deno.test("index: every action is complete; credit-spending and create actions are not idempotent", () => {
  for (const a of app.actions) {
    assert(a.type && a.description && a.output && a.resource, a.key);
    assertEquals(typeof a.execute, "function");
    if (a.type === "perform") assertEquals(typeof a.idempotent, "boolean", a.key);
    if (/-(enrich|create)$/.test(a.key) || a.key.endsWith("search-and-enrich")) {
      assertEquals(a.idempotent, false, a.key);
    }
  }
});

Deno.test("index: one apiKey auth in the api_key header and the three health checks", () => {
  assertEquals(app.auth.map((a) => a.key), ["api-key"]);
  assertEquals(app.auth[0].type, "apiKey");
  assertEquals((app.healthChecks ?? []).map((h) => h.key), ["service", "api", "quota"]);
});
