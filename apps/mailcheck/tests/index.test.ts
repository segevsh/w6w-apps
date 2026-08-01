import { assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: declares one auth method and the expected action/health-check counts", () => {
  assertEquals(app.auth?.length, 1);
  assertEquals(app.auth?.[0].key, "api-key");
  assertEquals(app.actions.length, 4);
  assertEquals(app.healthChecks?.length, 1);
});

Deno.test("index: every action key is unique", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  assertEquals(
    new Set(keys),
    new Set(["check-email", "batch-check-create", "batch-operation-get", "batch-operation-list"]),
  );
});

Deno.test("index: every action has a title, type and execute hook", () => {
  for (const action of app.actions) {
    assertEquals(typeof action.title, "string");
    assertEquals(typeof action.execute, "function");
    assertEquals(["read", "perform"].includes(action.type), true);
  }
});

Deno.test("index: health checks declare the service check as unavailable", () => {
  const keys = app.healthChecks?.map((h) => h.key);
  assertEquals(keys, ["service"]);
  assertEquals(app.healthChecks?.[0].unavailable?.reason !== undefined, true);
  assertEquals(app.healthChecks?.[0].check, undefined);
});
