import { test } from "node:test";
import { assert, assertEquals } from "./_assert.ts";
import app from "../index.ts";

test("index: exports 17 unique actions, one auth method, two health checks", () => {
  assertEquals(app.actions.length, 17);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "action keys must be unique");
  assertEquals(app.auth?.length, 1);
  assertEquals(app.auth?.[0].key, "api-key");
  assertEquals(app.healthChecks?.length, 2);
});

test("index: every action declares a type, title, and params array", () => {
  for (const action of app.actions) {
    assert(["read", "search", "perform"].includes(action.type), `${action.key}: valid type`);
    assert(action.title.length > 0, `${action.key}: has a title`);
    assert(Array.isArray(action.params), `${action.key}: has params`);
  }
});
