import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 32;

Deno.test("index: exports actions, one auth method and two health checks", () => {
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth?.length, 1);
  assertEquals(app.healthChecks?.length, 2);
});

Deno.test("index: action keys are unique kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const k of keys) assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(k), k);
});

Deno.test("index: every action has a type, description, output and execute", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), a.key);
    assert(a.description && a.description.length > 0, a.key);
    assertEquals(typeof a.execute, "function", a.key);
    assert(Array.isArray(a.output), a.key);
  }
});

Deno.test("index: every perform action declares idempotency; only safe repeats are true", () => {
  const performs = app.actions.filter((a) => a.type === "perform");
  for (const a of performs) assertEquals(typeof a.idempotent, "boolean", a.key);
  const nonIdem = performs.filter((a) => a.idempotent === false).map((a) => a.key).sort();
  assertEquals(nonIdem, [
    "campaign-create",
    "email-send",
    "list-create",
    "merge-tag-add",
    "sms-send",
    "template-create",
    "template-duplicate",
  ]);
});

Deno.test("index: no action param is named auth_token (the credential lives in sign)", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) assert(p.key !== "auth_token", a.key);
  }
});

Deno.test("index: every health check is informational and declares absence", () => {
  for (const h of app.healthChecks ?? []) {
    assertEquals(h.severity, "informational");
    assert(h.unavailable?.reason);
  }
});
