import { assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: declares two auth methods and the expected action/health-check counts", () => {
  assertEquals(app.auth?.length, 2);
  assertEquals(app.auth?.map((a) => a.key), ["oauth2", "page-token"]);
  assertEquals(app.actions.length, 14);
  assertEquals(app.healthChecks?.length, 2);
});

Deno.test("index: every action key is unique", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
});

Deno.test("index: every action has a title, type and execute hook", () => {
  for (const action of app.actions) {
    assertEquals(typeof action.title, "string");
    assertEquals(typeof action.type, "string");
    assertEquals(typeof action.execute, "function");
  }
});

Deno.test("index: does not duplicate facebook-lead-ads' leadgen actions", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(keys.includes("list-forms"), false);
  assertEquals(keys.includes("list-recent-leads"), false);
});

Deno.test("index: health checks are keyed service and quota", () => {
  const keys = app.healthChecks?.map((h) => h.key);
  assertEquals(keys, ["service", "quota"]);
});
