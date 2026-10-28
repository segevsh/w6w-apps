import { assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: one bearer page-token auth method", () => {
  assertEquals(app.auth?.map((a) => a.key), ["page-token"]);
  assertEquals(app.auth?.[0].type, "bearer");
});

Deno.test("index: declares 19 actions with unique kebab-case keys", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(keys.length, 19);
  assertEquals(new Set(keys).size, keys.length);
  for (const k of keys) assertEquals(/^[a-z]+(-[a-z]+)*$/.test(k), true, k);
});

Deno.test("index: every action has title, type, execute", () => {
  for (const a of app.actions) {
    assertEquals(typeof a.title, "string");
    assertEquals(["read", "search", "perform"].includes(a.type), true);
    assertEquals(typeof a.execute, "function");
  }
});

Deno.test("index: every perform action states idempotency", () => {
  for (const a of app.actions.filter((x) => x.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", a.key);
  }
});

Deno.test("index: health checks are api, service, quota", () => {
  assertEquals(app.healthChecks?.map((h) => h.key), ["api", "service", "quota"]);
});
