import { assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exposes 9 uniquely-keyed actions", () => {
  assertEquals(app.actions.length, 9);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "action keys must be unique");
});

Deno.test("index: declares basic then oauth2 auth methods", () => {
  const keys = app.auth?.map((a) => a.key);
  assertEquals(keys, ["basic", "oauth2"]);
});

Deno.test("index: declares service and quota health checks", () => {
  const keys = app.healthChecks?.map((h) => h.key);
  assertEquals(keys, ["service", "quota"]);
});

Deno.test("index: every action declares a resource and a valid type", () => {
  for (const action of app.actions) {
    assertEquals(typeof action.resource, "string");
    assertEquals(["read", "search", "perform", "control"].includes(action.type), true);
  }
});
