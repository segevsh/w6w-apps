import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports 5 actions, 2 auth methods and 2 health checks", () => {
  assertEquals(app.actions.length, 5);
  assertEquals(app.auth.map((a) => a.key), ["product-secret-key", "api-key"]);
  assertEquals(app.healthChecks.length, 2);
});

Deno.test("index: action keys are unique kebab-case with execute, output and description", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const a of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.key), a.key);
    assert(a.description && Array.isArray(a.output) && a.output.length > 0, a.key);
    assertEquals(typeof a.execute, "function");
  }
});

Deno.test("index: only verify is a read; every perform states idempotency, usage ones are not", () => {
  for (const a of app.actions) {
    assertEquals(a.type, a.key === "license-verify" ? "read" : "perform");
    if (a.type === "perform") assertEquals(typeof a.idempotent, "boolean", a.key);
  }
  const by = Object.fromEntries(app.actions.map((a) => [a.key, a]));
  assertEquals(by["license-usage-increase"].idempotent, false);
  assertEquals(by["license-usage-decrease"].idempotent, false);
  assertEquals(by["license-enable"].idempotent, true);
});

Deno.test("index: health checks are informational absences", () => {
  for (const c of app.healthChecks) {
    assertEquals(c.severity, "informational");
    assertEquals(typeof c.unavailable?.reason, "string");
  }
});
