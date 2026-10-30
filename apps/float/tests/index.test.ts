import { test } from "node:test";
import { assertEquals } from "./_assert.ts";
import app from "../index.ts";

test("app - declares exactly one auth method, bearer API token", () => {
  assertEquals(app.auth?.length, 1);
  assertEquals(app.auth?.[0].key, "api-token");
  assertEquals(app.auth?.[0].type, "bearer");
});

test("app - declares the service and quota health checks", () => {
  const keys = app.healthChecks?.map((h) => h.key).sort();
  assertEquals(keys, ["quota", "service"]);
});

test("app - every action has a unique kebab-case key", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const key of keys) {
    assertEquals(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), true, `not kebab-case: ${key}`);
  }
});

test("app - declares exactly 40 actions across the 8 covered resources", () => {
  assertEquals(app.actions.length, 40);
  const byResource = new Map<string, number>();
  for (const a of app.actions) {
    const r = a.resource ?? "(none)";
    byResource.set(r, (byResource.get(r) ?? 0) + 1);
  }
  for (
    const resource of [
      "person",
      "project",
      "client",
      "milestone",
      "timeoff",
      "allocation",
      "status",
      "logged-time",
    ]
  ) {
    assertEquals(byResource.get(resource), 5, `expected 5 actions for resource ${resource}`);
  }
});

test("app - every action declares params and output arrays", () => {
  for (const a of app.actions) {
    assertEquals(Array.isArray(a.params), true, `${a.key} missing params array`);
    assertEquals(Array.isArray(a.output), true, `${a.key} missing output array`);
  }
});
