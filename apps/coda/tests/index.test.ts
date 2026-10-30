import { test } from "node:test";
import { assert, assertEquals } from "./_assert.ts";
import app from "../index.ts";

test("index: exposes exactly the expected action keys, each unique", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(
    keys.sort(),
    [
      "delete-row",
      "delete-rows",
      "get-doc",
      "get-mutation-status",
      "get-row",
      "list-columns",
      "list-docs",
      "list-rows",
      "list-tables",
      "update-row",
      "upsert-rows",
    ].sort(),
  );
  assertEquals(new Set(keys).size, keys.length);
});

test("index: declares the api-token auth method", () => {
  assertEquals(app.auth?.map((a) => a.key), ["api-token"]);
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
