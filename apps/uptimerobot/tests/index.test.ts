import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exposes exactly the expected action keys, each unique", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(
    keys.sort(),
    [
      "account-get",
      "monitor-list",
      "monitor-get",
      "monitor-create",
      "monitor-update",
      "monitor-delete",
      "monitor-reset",
      "alert-contact-list",
    ].sort(),
  );
  assertEquals(new Set(keys).size, keys.length);
});

Deno.test("index: declares the api-key auth method", () => {
  assertEquals(app.auth?.map((a) => a.key), ["api-key"]);
});

Deno.test("index: declares the service and quota health checks", () => {
  assertEquals(app.healthChecks?.map((h) => h.key).sort(), ["quota", "service"]);
});

Deno.test("index: every action declares a type and a title", () => {
  for (const action of app.actions) {
    assert(["read", "search", "perform", "control"].includes(action.type));
    assert(action.title.length > 0);
  }
});

Deno.test("index: every perform action declares idempotent explicitly", () => {
  for (const action of app.actions) {
    if (action.type === "perform") {
      assertEquals(typeof action.idempotent, "boolean");
    }
  }
});

Deno.test("index: the service check declares unavailable, not a hook", () => {
  const service = app.healthChecks?.find((h) => h.key === "service");
  assert(service);
  assert(service.unavailable, "service check should be a declared absence");
  assertEquals(service.check, undefined);
});

Deno.test("index: the quota check is a live hook", () => {
  const quota = app.healthChecks?.find((h) => h.key === "quota");
  assert(quota);
  assertEquals(typeof quota.check, "function");
  assertEquals(quota.unavailable, undefined);
});
