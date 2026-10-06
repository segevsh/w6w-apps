import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports 24 uniquely keyed kebab-case actions and one basic auth method", () => {
  assertEquals(app.actions.length, 24);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const k of keys) assert(/^[a-z]+(-[a-z]+)*$/.test(k), k);
  assertEquals(app.auth!.map((a) => a.key), ["basic"]);
  assertEquals(app.auth![0].type, "basic");
});

Deno.test("index: every perform action states idempotency, every action has an execute hook", () => {
  for (const a of app.actions) {
    assertEquals(typeof a.execute, "function", a.key);
    if (a.type === "perform") assertEquals(typeof a.idempotent, "boolean", a.key);
  }
});

Deno.test("index: declares service, api and quota health checks with an informational quota", () => {
  const checks = app.healthChecks!;
  assertEquals(checks.map((c) => c.key), ["service", "api", "quota"]);
  assertEquals(checks.every((c) => c.severity === "informational" || c.key !== "quota"), true);
});
