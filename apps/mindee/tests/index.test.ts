import { assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: declares one auth method and the expected action count", () => {
  assertEquals(app.auth?.length, 1);
  assertEquals(app.auth?.[0].key, "api-key");
  assertEquals(app.actions.length, 16);
  assertEquals(app.healthChecks?.length, 2);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const key of keys) {
    if (!/^[a-z][a-z0-9-]*$/.test(key)) throw new Error(`not kebab-case: ${key}`);
  }
});

Deno.test("index: every action declares a type and a title", () => {
  for (const action of app.actions) {
    if (!action.type) throw new Error(`${action.key} has no type`);
    if (!action.title) throw new Error(`${action.key} has no title`);
  }
});

Deno.test("index: health check keys are unique", () => {
  const keys = (app.healthChecks ?? []).map((h) => h.key);
  assertEquals(new Set(keys).size, keys.length);
});
