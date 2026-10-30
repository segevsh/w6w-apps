import { test } from "node:test";
import { assert, assertEquals } from "./_assert.ts";
import app from "../index.ts";

test("index: exposes exactly the expected action keys, each unique", () => {
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

test("index: declares the api-key auth method", () => {
  assertEquals(app.auth?.map((a) => a.key), ["api-key"]);
});

test("index: declares the service and quota health checks", () => {
  assertEquals(app.healthChecks?.map((h) => h.key).sort(), ["quota", "service"]);
});

test("index: every action declares a type and a title", () => {
  for (const action of app.actions) {
    assert(["read", "search", "perform", "control"].includes(action.type));
    assert(action.title.length > 0);
  }
});

test("index: every perform action declares idempotent explicitly", () => {
  for (const action of app.actions) {
    if (action.type === "perform") {
      assertEquals(typeof action.idempotent, "boolean");
    }
  }
});

test("index: the service check declares unavailable, not a hook", () => {
  const service = app.healthChecks?.find((h) => h.key === "service");
  assert(service);
  assert(service.unavailable, "service check should be a declared absence");
  assertEquals(service.check, undefined);
});

test("index: the quota check is a live hook", () => {
  const quota = app.healthChecks?.find((h) => h.key === "quota");
  assert(quota);
  assertEquals(typeof quota.check, "function");
  assertEquals(quota.unavailable, undefined);
});
