import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports 21 actions, two auth methods and two health checks", () => {
  assertEquals(app.actions.length, 21);
  assertEquals(app.auth.map((a) => a.key), ["access-token", "oauth2"]);
  assertEquals(app.healthChecks.length, 2);
});

Deno.test("index: action keys are unique kebab-case with type, description, execute, output", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const a of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.key), a.key);
    assert(["read", "search", "perform"].includes(a.type), a.key);
    assert(a.description && a.description.length > 0, a.key);
    assertEquals(typeof a.execute, "function", a.key);
    assert(Array.isArray(a.output), a.key);
    for (const p of a.params ?? []) assert(p.key && p.label, `${a.key}/${p.key}`);
  }
});

Deno.test("index: every perform action states idempotency; create-or-update ones are false", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", a.key);
  }
  for (const k of ["category-save", "customer-save"]) {
    assertEquals(app.actions.find((a) => a.key === k)?.idempotent, false, k);
  }
});

Deno.test("index: both health checks declare informational unavailable/service posture", () => {
  const quota = app.healthChecks.find((h) => h.key === "quota")!;
  assertEquals(quota.severity, "informational");
  assert(quota.unavailable?.reason);
  const service = app.healthChecks.find((h) => h.key === "service")!;
  assertEquals(service.kind, "service");
  assertEquals(service.network?.allow, ["loyverse.statuspage.io"]);
});
