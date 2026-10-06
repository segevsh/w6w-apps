import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";
import pkg from "../package.json" with { type: "json" };

const ACTION_COUNT = 24;

Deno.test("index: exports actions, one auth method and two health checks", () => {
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 1);
  assertEquals(app.auth[0].key, "client-credentials");
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
    assert(Array.isArray(a.output), a.key);
    assertEquals(typeof a.execute, "function", a.key);
  }
});

Deno.test("index: every perform declares idempotency; creates and sends are not retryable", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", a.key);
  }
  for (
    const key of [
      "contact-create",
      "contact-batch-create",
      "contact-message-send",
      "ticket-create",
      "ticket-reply",
      "lyro-qa-create",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

Deno.test("index: no param is named like a credential", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) assert(!/token|password|secret/i.test(p.key), a.key);
  }
});

Deno.test("index: the egress allowlist is the one API host", () => {
  assertEquals(pkg.w6w.network.allow, ["api.tidio.com"]);
});
