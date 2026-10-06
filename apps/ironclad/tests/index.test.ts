import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 28;

Deno.test("index: exports actions, four auth methods and two health checks", () => {
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.map((a) => a.key), [
    "oauth2",
    "oauth2-eu1",
    "oauth2-demo",
    "client-credentials",
  ]);
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "quota"]);
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
    assert(Array.isArray(a.output), `${a.key}: no output`);
  }
});

Deno.test("index: every perform action states idempotency explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
});

Deno.test("index: creates and state changes are never marked idempotent", () => {
  const byKey = new Map(app.actions.map((a) => [a.key, a]));
  for (
    const k of [
      "workflow-create",
      "workflow-cancel",
      "workflow-pause",
      "workflow-resume",
      "workflow-comment-create",
      "record-create",
      "entity-create",
      "webhook-create",
    ]
  ) {
    assertEquals(byKey.get(k)?.idempotent, false, k);
  }
});

Deno.test("index: no Action handles a credential or reads one from its input", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!/token|secret|password/i.test(p.key), `${a.key}: credential-like param ${p.key}`);
    }
  }
});

Deno.test("index: the health checks include an informational unavailable quota", () => {
  const quota = app.healthChecks.find((h) => h.key === "quota")!;
  assertEquals(quota.severity, "informational");
  assert(quota.unavailable?.reason);
});
