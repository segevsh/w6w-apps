import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 53;

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 1);
  assertEquals(app.auth[0].key, "access-token");
  assertEquals(app.healthChecks.length, 2);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const key of keys) assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
});

Deno.test("index: every action has a type, description, output and execute hook", () => {
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

/** Creates, refunds, rotations and counter changes must never be auto-retried. */
Deno.test("index: non-repeatable performs are not marked idempotent", () => {
  for (
    const key of [
      "product-create",
      "sale-refund",
      "sale-resend-receipt",
      "license-rotate",
      "license-decrement-uses-count",
      "license-verify",
      "offer-code-create",
      "resource-subscription-create",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

Deno.test("index: set-style updates are marked idempotent", () => {
  for (const key of ["product-update", "product-enable", "product-disable", "license-disable"]) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, true, key);
  }
});

Deno.test("index: the declared surface covers every pillar", () => {
  const resources = new Set(app.actions.map((a) => a.resource));
  for (
    const r of ["product", "sale", "subscriber", "license", "offer-code", "variant", "webhook"]
  ) assert(resources.has(r), `missing resource ${r}`);
});

Deno.test("index: no action takes a credential-shaped parameter", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!/token|password|authorization/i.test(p.key), `${a.key}: ${p.key}`);
    }
  }
});
