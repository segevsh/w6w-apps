import { assertEquals, assertNotEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports 8 actions with unique kebab-case keys", () => {
  assertEquals(app.actions.length, 8);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "action keys must be unique");
  for (const key of keys) {
    assertEquals(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), true, `"${key}" must be kebab-case`);
  }
});

Deno.test("index: every action has execute, type and title", () => {
  const validTypes = new Set(["read", "search", "perform", "control"]);
  for (const action of app.actions) {
    assertEquals(typeof action.execute, "function");
    assertEquals(validTypes.has(action.type), true, `bad type on ${action.key}`);
    assertNotEquals(action.title, undefined);
  }
});

Deno.test("index: every perform action declares idempotent explicitly", () => {
  for (const action of app.actions) {
    if (action.type === "perform") {
      assertEquals(typeof action.idempotent, "boolean", `${action.key} missing idempotent flag`);
    }
  }
});

Deno.test("index: exactly one auth method, api-token, requiring test", () => {
  assertEquals(app.auth?.length, 1);
  const [auth] = app.auth!;
  assertEquals(auth.key, "api-token");
  assertEquals(auth.type, "apiKey");
  assertEquals(typeof auth.test, "function");
  assertEquals(typeof auth.sign, "function");
});

Deno.test("index: declares service + quota health checks with unique keys", () => {
  assertEquals(app.healthChecks?.length, 2);
  const keys = app.healthChecks!.map((h) => h.key);
  assertEquals(new Set(keys).size, keys.length);
  assertEquals(keys.includes("service"), true);
  assertEquals(keys.includes("quota"), true);
});
