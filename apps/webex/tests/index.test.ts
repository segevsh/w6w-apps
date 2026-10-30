import { test } from "node:test";
import { assertEquals } from "./_assert.ts";
import app from "../index.ts";

test("index: declares one auth method and the expected action/health-check counts", () => {
  assertEquals(app.auth?.length, 1);
  assertEquals(app.auth?.map((a) => a.key), ["oauth2"]);
  assertEquals(app.actions.length, 34);
  assertEquals(app.healthChecks?.length, 2);
});

test("index: health checks are keyed service and quota", () => {
  assertEquals(app.healthChecks?.map((h) => h.key), ["service", "quota"]);
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

test("index: no create/update/delete action targets people (SCIM 2.0 owns writes)", () => {
  const personWrites = app.actions.filter((a) => a.resource === "person" && a.type === "perform");
  assertEquals(personWrites, []);
});
