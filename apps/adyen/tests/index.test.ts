import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 24;

Deno.test("index: exports actions, auth and health checks", () => {
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 1);
  assertEquals(app.auth[0].key, "api-key");
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "api", "quota"]);
});

Deno.test("index: unavailable health checks declare informational severity", () => {
  for (const h of app.healthChecks.filter((h) => h.unavailable)) {
    assertEquals(h.severity, "informational", h.key);
  }
  assertEquals(app.healthChecks.filter((h) => h.unavailable).length, 2);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const key of keys) assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
});

Deno.test("index: every action has a valid type, a description, an execute hook and an output", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type`);
    assert(a.description && a.description.length > 0, `${a.key}: no description`);
    assertEquals(typeof a.execute, "function", `${a.key}: no execute`);
    assert(Array.isArray(a.output), `${a.key}: no output`);
  }
});

Deno.test("index: every perform action states idempotency explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
});

/** Money moves: a retry without an idempotency key would repeat the side effect. */
Deno.test("index: payments and modifications are not marked idempotent", () => {
  for (
    const key of [
      "create-payment",
      "submit-payment-details",
      "capture-payment",
      "cancel-payment",
      "refund-payment",
      "reverse-payment",
      "update-authorised-amount",
      "create-donation",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

Deno.test("index: lookups are reads and everything that changes state is a perform", () => {
  const reads = new Set([
    "get-session-result",
    "get-payment-methods",
    "get-payment-methods-balance",
    "get-payment-link",
    "list-stored-payment-methods",
    "list-donation-campaigns",
    "get-card-details",
  ]);
  for (const a of app.actions) {
    assertEquals(a.type === "read", reads.has(a.key), `${a.key}: type ${a.type}`);
  }
});

Deno.test("index: param keys are unique within an action", () => {
  for (const a of app.actions) {
    const keys = (a.params ?? []).map((p) => p.key);
    assertEquals(new Set(keys).size, keys.length, `${a.key}: duplicate param key`);
  }
});

Deno.test("index: no action carries a credential param", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!/api.?key|authorization/i.test(p.key), `${a.key}: param ${p.key} looks like a key`);
    }
  }
});

Deno.test("index: deprecated and out-of-scope operations are absent", () => {
  const keys = app.actions.map((a) => a.key);
  for (const k of keys) assert(!/origin-key/.test(k), `deprecated /originKeys exposed: ${k}`);
});
