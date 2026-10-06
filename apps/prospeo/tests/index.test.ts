import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports 8 actions, one auth method and three health checks", () => {
  assertEquals(app.actions.length, 8);
  assertEquals(app.auth.length, 1);
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "api", "quota"]);
  assertEquals(app.auth[0].key, "api-key");
});

Deno.test("index: action keys are unique kebab-case with type, description, output, execute", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const a of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.key), `not kebab-case: ${a.key}`);
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type`);
    assert(a.description && a.description.length > 0, `${a.key}: no description`);
    assertEquals(typeof a.execute, "function");
    assert(Array.isArray(a.output) && a.output.length > 0, `${a.key}: no output`);
  }
});

Deno.test("index: perform actions declare idempotent; selects carry options", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", a.key);
  }
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(p.label, `${a.key}.${p.key}: no label`);
      if (p.type === "select") assert(((p.options as unknown[])?.length ?? 0) > 0, p.key);
    }
  }
});
