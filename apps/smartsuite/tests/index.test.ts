import { assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("entry: declares 17 actions with unique kebab-case keys", () => {
  assertEquals(app.actions.length, 17);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const key of keys) assertEquals(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), true, key);
});

Deno.test("entry: action types are 6 read, 2 search, 9 perform", () => {
  const byType = (t: string) => app.actions.filter((a) => a.type === t).length;
  assertEquals(byType("read"), 6);
  assertEquals(byType("search"), 2);
  assertEquals(byType("perform"), 9);
});

Deno.test("entry: every perform action declares idempotent", () => {
  for (const action of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof action.idempotent, "boolean", action.key);
  }
});

Deno.test("entry: declares the two-header custom auth method", () => {
  assertEquals(app.auth?.length, 1);
  assertEquals(app.auth?.[0].key, "api-key");
  assertEquals(app.auth?.[0].type, "custom");
  assertEquals(app.auth?.[0].fields?.map((f) => f.key), ["accountId", "apiKey"]);
});

Deno.test("entry: declares the service and quota health checks", () => {
  assertEquals(app.healthChecks?.map((c) => c.key), ["service", "quota"]);
  assertEquals(app.healthChecks?.map((c) => c.kind), ["service", "quota"]);
});
