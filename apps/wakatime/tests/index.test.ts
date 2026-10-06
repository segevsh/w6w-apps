import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports 25 uniquely-keyed kebab-case actions", () => {
  assertEquals(app.actions.length, 25);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const k of keys) assert(/^[a-z]+(-[a-z]+)+$/.test(k), k);
});

Deno.test("index: every action is complete and creates are not idempotent", () => {
  for (const a of app.actions) {
    assert(a.type, `${a.key} type`);
    assert(a.description, `${a.key} description`);
    assert(a.output, `${a.key} output`);
    assert(a.resource, `${a.key} resource`);
    assertEquals(typeof a.execute, "function");
    if (a.type === "perform") assert(a.idempotent !== undefined, `${a.key} idempotent`);
    if (a.key.endsWith("-create")) assertEquals(a.idempotent, false, a.key);
  }
});

Deno.test("index: no action carries a credential param", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!/token|password|secret|authorization|apikey/i.test(p.key), `${a.key}.${p.key}`);
    }
  }
});

Deno.test("index: one apiKey auth and the three health checks", () => {
  assertEquals(app.auth!.map((a) => a.key), ["api-key"]);
  assertEquals(app.auth![0].type, "apiKey");
  assertEquals((app.healthChecks ?? []).map((h) => h.key), ["service", "api", "quota"]);
});
