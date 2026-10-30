import { test } from "node:test";
import { assertEquals } from "./_assert.ts";
import app from "../index.ts";

test("index: exposes every action with a unique kebab-case key", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "action keys must be unique");
  for (const key of keys) {
    assertEquals(/^[a-z]+(-[a-z]+)*$/.test(key), true, `${key} is not kebab-case`);
  }
  assertEquals(keys, [
    "search-create",
    "search-oneshot",
    "search-get",
    "search-get-results",
    "search-get-many",
    "search-delete",
    "saved-search-get-many",
    "index-get-many",
  ]);
});

test("index: declares exactly one auth method, backed by test", () => {
  assertEquals(app.auth?.length, 1);
  assertEquals(app.auth?.[0].key, "token");
  assertEquals(typeof app.auth?.[0].test, "function");
});

test("index: declares the service health check", () => {
  assertEquals(app.healthChecks?.map((h) => h.key), ["service"]);
});
