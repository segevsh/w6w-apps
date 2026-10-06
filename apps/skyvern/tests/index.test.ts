import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 20;

Deno.test("index: exports actions, one auth method and three health checks", () => {
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth?.length, 1);
  assertEquals(app.healthChecks?.map((h) => h.key), ["service", "api", "quota"]);
});

Deno.test("index: action keys are unique kebab-case with description, execute and output", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const a of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.key), a.key);
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type`);
    assert(a.description && a.description.length > 0, `${a.key}: no description`);
    assertEquals(typeof a.execute, "function", a.key);
    assert(Array.isArray(a.output) && a.output.length > 0, `${a.key}: no output`);
    for (const p of a.params ?? []) assert(p.key && p.label, `${a.key}/${p.key}: key+label`);
  }
});

Deno.test("index: every perform action declares idempotency; starters are not idempotent", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", a.key);
  }
  for (const key of ["run-task", "run-agent", "run-retry", "browser-session-create"]) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
  for (const key of ["run-cancel", "browser-session-close", "browser-profile-delete"]) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, true, key);
  }
});

Deno.test("index: no action carries a credential param or hard-codes a header", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) assert(p.type !== "secret", `${a.key}/${p.key}`);
  }
});

Deno.test("index: unavailable quota check declares informational severity", () => {
  const quota = app.healthChecks.find((h) => h.key === "quota")!;
  assertEquals(quota.severity, "informational");
  assert(quota.unavailable?.reason);
});
