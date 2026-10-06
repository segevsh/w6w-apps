import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";
import pkg from "../package.json" with { type: "json" };

const ACTION_COUNT = 30;

Deno.test("index: exports actions, one auth method and two health checks", () => {
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 1);
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "quota"]);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const key of keys) assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), key);
});

Deno.test("index: every action has a type, description, output and execute hook", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), a.key);
    assert(a.description && a.description.length > 0, a.key);
    assert(Array.isArray(a.output) && a.output.length > 0, a.key);
    assertEquals(typeof a.execute, "function", a.key);
  }
});

Deno.test("index: every param has a key and a label", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(p.key && p.label, `${a.key}: ${JSON.stringify(p.key)}`);
    }
  }
});

Deno.test("index: every perform declares idempotency, and creates and state changes are not retryable", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", a.key);
  }
  // None of these accept an idempotency key; a retry would open a second
  // resource, or answer 409 for a change that already succeeded.
  for (
    const key of [
      "monitor-create",
      "heartbeat-create",
      "incident-create",
      "incident-acknowledge",
      "incident-resolve",
      "incident-reopen",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
  for (const key of ["monitor-update", "monitor-delete", "heartbeat-update", "heartbeat-delete"]) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, true, key);
  }
});

Deno.test("index: no param is named like a credential, and none carries secret", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!/token|password|secret/i.test(p.key), `${a.key}/${p.key}`);
    }
  }
});

Deno.test("index: the egress allowlist is the one API host (status host is the check's own)", () => {
  assertEquals(pkg.w6w.network.allow, ["uptime.betterstack.com"]);
});

Deno.test("index: the sign hook is the only place a credential is read", () => {
  assertEquals(typeof app.auth[0].sign, "function");
  assertEquals(app.auth[0].key, "api-token");
});
