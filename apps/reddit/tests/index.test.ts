import { assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: declares one oauth2 auth method and 8 actions", () => {
  assertEquals(app.auth?.length, 1);
  assertEquals(app.auth?.[0].key, "oauth2");
  assertEquals(app.actions.length, 8);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const key of keys) {
    assertEquals(/^[a-z]+(-[a-z]+)*$/.test(key), true, `${key} is not kebab-case`);
  }
});

Deno.test("index: every action declares execute, and perform actions declare idempotent", () => {
  for (const action of app.actions) {
    assertEquals(typeof action.execute, "function");
    if (action.type === "perform") {
      assertEquals(typeof action.idempotent, "boolean", `${action.key} should declare idempotent`);
    }
  }
});

Deno.test("index: declares service and quota health checks alongside the derived auth check", () => {
  const keys = app.healthChecks?.map((c) => c.key) ?? [];
  assertEquals(keys, ["service", "quota"]);
});
