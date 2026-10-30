import { test } from "node:test";
import { assert, assertEquals } from "./_assert.ts";
import app from "../index.ts";

test("index: exposes exactly the expected action keys, each unique", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(
    keys.sort(),
    [
      "database-list",
      "statement-cancel",
      "statement-execute",
      "statement-get",
      "warehouse-list",
    ].sort(),
  );
  assertEquals(new Set(keys).size, keys.length);
});

test("index: declares the key-pair auth method", () => {
  assertEquals(app.auth?.map((a) => a.key), ["key-pair"]);
});

test("index: declares the service and account health checks", () => {
  assertEquals(app.healthChecks?.map((h) => h.key).sort(), ["account", "service"]);
});

test("index: every action declares a type and a title", () => {
  for (const action of app.actions) {
    assert(["read", "search", "perform", "control"].includes(action.type));
    assert(action.title.length > 0);
  }
});
