import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports 18 actions, one auth method and two health checks", () => {
  assertEquals(app.actions.length, 18);
  assertEquals(app.auth.length, 1);
  assertEquals(app.healthChecks.length, 2);
});

Deno.test("index: action keys are unique kebab-case and fully described", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const a of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.key), `not kebab-case: ${a.key}`);
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type`);
    assert(a.description && a.description.length > 0, `${a.key}: no description`);
    assertEquals(typeof a.execute, "function");
    assert(Array.isArray(a.output), `${a.key}: no output`);
  }
});

Deno.test("index: every perform action states idempotency; sends are never idempotent", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
  for (const key of ["sms-send", "mms-send", "whatsapp-send", "rcs-send", "webhook-create"]) {
    assertEquals(app.actions.find((a) => a.key === key)!.idempotent, false, key);
  }
  for (const key of ["webhook-update", "webhook-delete"]) {
    assertEquals(app.actions.find((a) => a.key === key)!.idempotent, true, key);
  }
});

Deno.test("index: the quota check is declared unavailable at informational severity", () => {
  const quota = app.healthChecks.find((h) => h.key === "quota")!;
  assertEquals(quota.severity, "informational");
  assert(quota.unavailable?.reason);
});
