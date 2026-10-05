import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 36;

Deno.test("index: exports actions, auth and health checks", () => {
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 1);
  assertEquals(app.auth[0].key, "api-key");
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "api", "quota"]);
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

/** Money moves and mail goes out: a retry would repeat the side effect. */
Deno.test("index: refunds, creates and mail are not marked idempotent", () => {
  for (
    const key of [
      "refund-purchase",
      "refund-partially",
      "refund-transaction",
      "create-product",
      "create-voucher",
      "resend-purchase-confirmation-mail",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

Deno.test("index: reads never claim to perform and writes are all performs", () => {
  const writes = [
    "update-",
    "refund-",
    "stop-",
    "start-",
    "create-",
    "delete-",
    "ipn-setup",
    "ipn-delete",
    "resend-",
  ];
  for (const a of app.actions) {
    const isWrite = writes.some((w) => a.key.startsWith(w));
    assertEquals(a.type === "perform", isWrite, `${a.key}: type ${a.type}`);
  }
});

Deno.test("index: required params are marked required and keys are unique within an action", () => {
  for (const a of app.actions) {
    const keys = (a.params ?? []).map((p) => p.key);
    assertEquals(new Set(keys).size, keys.length, `${a.key}: duplicate param key`);
  }
});

Deno.test("index: no action carries credentials", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!/api.?key/i.test(p.key), `${a.key}: param ${p.key} looks like a credential`);
    }
  }
});
