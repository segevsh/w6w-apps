import { assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports 9 actions with unique keys", () => {
  assertEquals(app.actions.length, 9);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
});

Deno.test("index: exports both auth methods", () => {
  const keys = (app.auth ?? []).map((a) => a.key);
  assertEquals(keys, ["api-key", "basic"]);
});

Deno.test("index: exports 3 health checks with unique keys", () => {
  const checks = app.healthChecks ?? [];
  assertEquals(checks.length, 3);
  const keys = checks.map((c) => c.key);
  assertEquals(new Set(keys).size, keys.length);
  assertEquals(keys.sort(), ["quota", "service", "site"]);
});

Deno.test("index: every action has a unique kebab-case key and a valid type", () => {
  const validTypes = new Set(["read", "search", "perform", "control"]);
  for (const action of app.actions) {
    assertEquals(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(action.key), true, `bad key: ${action.key}`);
    assertEquals(validTypes.has(action.type), true, `bad type on ${action.key}`);
  }
});

Deno.test("index: every perform action declares idempotent explicitly", () => {
  for (const action of app.actions) {
    if (action.type === "perform") {
      assertEquals(typeof action.idempotent, "boolean", `${action.key} missing idempotent flag`);
    }
  }
});
