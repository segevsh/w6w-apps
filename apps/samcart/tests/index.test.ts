import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 38;

Deno.test("index: exports actions, auth and health checks", () => {
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 1);
  assertEquals(app.auth[0].key, "api-key");
  assertEquals(app.healthChecks.length, 2);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const key of keys) assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
});

Deno.test("index: every action has a description, output and execute hook", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type`);
    assert(a.description && a.description.length > 0, `${a.key}: no description`);
    assertEquals(typeof a.execute, "function", `${a.key}: no execute`);
    assert(Array.isArray(a.output) && a.output.length > 0, `${a.key}: no output`);
  }
});

Deno.test("index: every perform action states idempotency explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
});

/** Anything that charges or refunds money must never be auto-retried. */
Deno.test("index: money-moving performs are not marked idempotent", () => {
  for (const key of ["order-add-product", "order-batch-add-product", "charge-refund"]) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

Deno.test("index: every param has a key and label, and selects carry options", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(p.key && p.label, `${a.key}: param without key/label`);
      if (p.type === "select") assert((p.options as unknown[])?.length > 0, `${a.key}.${p.key}`);
    }
  }
});

Deno.test("index: no action carries a credential parameter", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!/api.?key|sc-api|token|secret/i.test(p.key), `${a.key}.${p.key}`);
    }
  }
});
