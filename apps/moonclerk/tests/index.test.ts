import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports 6 uniquely-keyed kebab-case read-only actions", () => {
  assertEquals(app.actions.length, 6);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const a of app.actions) {
    assert(/^[a-z]+(-[a-z]+)+$/.test(a.key), a.key);
    assert(a.type === "read" || a.type === "search", `${a.key} is read-only`);
    assert(a.description, `${a.key} description`);
    assert(a.output, `${a.key} output`);
    assert(a.resource, `${a.key} resource`);
    assertEquals(typeof a.execute, "function");
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
