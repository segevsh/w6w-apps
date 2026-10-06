import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports 29 uniquely-keyed kebab-case actions", () => {
  assertEquals(app.actions.length, 29);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const k of keys) assert(/^[a-z]+(-[a-z]+)+$/.test(k), k);
});

Deno.test("index: every action is complete; writes are not idempotent, reads are not performs", () => {
  for (const a of app.actions) {
    assert(a.type, `${a.key} type`);
    assert(a.description, `${a.key} description`);
    assert(a.output, `${a.key} output`);
    assert(a.resource, `${a.key} resource`);
    assertEquals(typeof a.execute, "function");
    if (a.type === "perform") assertEquals(a.idempotent, false, a.key);
    if (/-(list|get)$/.test(a.key)) assertEquals(a.type, "read", a.key);
    if (/-(create|delete|book)$/.test(a.key)) assertEquals(a.type, "perform", a.key);
  }
});

Deno.test("index: one apiKey auth with both tokens and the three health checks", () => {
  assertEquals(app.auth.map((a) => a.key), ["api-key"]);
  assertEquals(app.auth[0].type, "apiKey");
  assertEquals(app.auth[0].fields?.map((f) => f.key), ["appSecretToken", "agreementGrantToken"]);
  assertEquals((app.healthChecks ?? []).map((h) => h.key), ["service", "api", "quota"]);
});
