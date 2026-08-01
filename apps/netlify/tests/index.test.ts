import { assertEquals, assertNotEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports 10 actions with unique kebab-case keys", () => {
  assertEquals(app.actions.length, 10);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "action keys must be unique");
  for (const key of keys) {
    assertEquals(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), true, `"${key}" must be kebab-case`);
  }
});

Deno.test("index: every action has execute, type and title", () => {
  for (const action of app.actions) {
    assertEquals(typeof action.execute, "function");
    assertNotEquals(action.type, undefined);
    assertNotEquals(action.title, undefined);
  }
});

Deno.test("index: exactly one auth method, personal-access-token, requiring test", () => {
  assertEquals(app.auth?.length, 1);
  const [auth] = app.auth!;
  assertEquals(auth.key, "personal-access-token");
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
