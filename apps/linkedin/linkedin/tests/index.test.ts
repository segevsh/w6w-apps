import { test } from "node:test";
import { assertEquals } from "./_assert.ts";
import app from "../index.ts";

test("index: declares two auth methods and the expected action/health-check counts", () => {
  assertEquals(app.auth?.length, 2);
  assertEquals(app.auth?.map((a) => a.key), ["oauth2", "oauth2-community-management"]);
  assertEquals(app.actions.length, 6);
  assertEquals(app.healthChecks?.length, 2);
});

test("index: every action key is unique", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
});

test("index: every action has a title, type and execute hook", () => {
  for (const action of app.actions) {
    assertEquals(typeof action.title, "string");
    assertEquals(typeof action.type, "string");
    assertEquals(typeof action.execute, "function");
  }
});

test("index: health checks are keyed service and quota", () => {
  const keys = app.healthChecks?.map((h) => h.key);
  assertEquals(keys, ["service", "quota"]);
});
