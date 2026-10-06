import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 30;

Deno.test("index: exports actions, one auth method and two health checks", () => {
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 1);
  assertEquals(app.healthChecks.length, 2);
});

Deno.test("index: every action key is unique and kebab-case, with a description and execute", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const a of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.key), `not kebab-case: ${a.key}`);
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type`);
    assert(a.description && a.description.length > 0, `${a.key}: no description`);
    assertEquals(typeof a.execute, "function");
    assert(Array.isArray(a.output), `${a.key}: no output`);
  }
});

Deno.test("index: every perform action states idempotency; reads do not", () => {
  for (const a of app.actions) {
    if (a.type === "perform") {
      assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent unset`);
    } else {
      assertEquals(a.idempotent, undefined, `${a.key}: read with idempotent`);
    }
  }
});

Deno.test("index: every source-scoped action requires source_id", () => {
  for (const a of app.actions) {
    const scoped = !["sources-list", "account-get", "goals-list", "annotations-list"].includes(
      a.key,
    ) && !a.key.startsWith("metric");
    const p = a.params?.find((x) => x.key === "source_id");
    assertEquals(Boolean(p?.required), scoped, a.key);
  }
});

Deno.test("index: both health checks declare informational/unavailable correctly", () => {
  const service = app.healthChecks.find((h) => h.key === "service")!;
  assertEquals(service.severity, "informational");
  assert(service.unavailable?.reason);
  assertEquals(service.check, undefined);
});
