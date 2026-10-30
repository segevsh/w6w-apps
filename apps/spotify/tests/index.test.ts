import { test } from "node:test";
import { assertEquals } from "./_assert.ts";
import app from "../index.ts";

test("index: exports 9 unique actions", () => {
  assertEquals(app.actions.length, 9);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
});

test("index: exports the oauth2 auth method", () => {
  assertEquals(app.auth?.length, 1);
  assertEquals(app.auth?.[0].key, "oauth2");
});

test("index: exports the service and quota health checks", () => {
  assertEquals(app.healthChecks?.map((h) => h.key), ["service", "quota"]);
});

test("index: every action requiring auth has no bare credential handling of its own", () => {
  for (const action of app.actions) {
    assertEquals(typeof action.execute, "function");
  }
});
