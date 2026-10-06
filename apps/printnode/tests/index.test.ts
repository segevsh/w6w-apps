import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports 18 actions, one auth method and three health checks", () => {
  assertEquals(app.actions.length, 18);
  assertEquals(app.auth.length, 1);
  assertEquals(app.healthChecks.length, 3);
});

Deno.test("index: action keys are unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const k of keys) assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(k), k);
});

Deno.test("index: every action has a type, description, output and execute", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), a.key);
    assert(a.description && a.description.length > 0, a.key);
    assert(Array.isArray(a.output), a.key);
    assertEquals(typeof a.execute, "function", a.key);
  }
});

Deno.test("index: every perform action states idempotency; creators are not idempotent", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", a.key);
  }
  for (const key of ["printjob-create", "webhook-create"]) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

Deno.test("index: health checks declare informational severity for the unavailable ones", () => {
  for (const h of app.healthChecks.filter((h) => h.unavailable)) {
    assertEquals(h.severity, "informational", h.key);
  }
  assertEquals(app.healthChecks.filter((h) => !h.unavailable).length, 1);
});
