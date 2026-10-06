import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 23;

Deno.test("index: exports actions, one auth method and three health checks", () => {
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 1);
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "api", "quota"]);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const key of keys) assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
});

Deno.test("index: every action has a valid type, description, output and execute hook", () => {
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

/** The vendor accepts no idempotency key: a retried create would duplicate the record. */
Deno.test("index: actions that create a record are not marked idempotent", () => {
  const byKey = new Map(app.actions.map((a) => [a.key, a]));
  for (
    const k of ["create-contact", "create-deal", "create-action", "create-note", "create-call"]
  ) {
    assertEquals(byKey.get(k)?.idempotent, false, k);
  }
});

Deno.test("index: no action asks for a credential field", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(
        !/api.?key|password|token|secret/i.test(p.key),
        `${a.key}: credential-like param ${p.key}`,
      );
    }
  }
});
