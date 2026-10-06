import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports actions, auth and health checks", () => {
  assertEquals(app.actions.length, 43);
  assertEquals(app.auth.length, 1);
  assertEquals(app.healthChecks.length, 3);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const key of keys) assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
});

Deno.test("index: every action has a valid type, description, output and execute", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type`);
    assert(a.description && a.description.length > 0, `${a.key}: no description`);
    assertEquals(typeof a.execute, "function", `${a.key}: no execute`);
    assert(Array.isArray(a.output) && a.output.length > 0, `${a.key}: no output`);
    assert(a.resource, `${a.key}: no resource`);
  }
});

Deno.test("index: every perform action declares idempotent; sends and creates do not claim it", () => {
  const byKey = new Map(app.actions.map((a) => [a.key, a]));
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
  for (
    const k of [
      "send-email",
      "send-bulk-email",
      "create-domain",
      "create-template",
      "create-webhook",
    ]
  ) {
    assertEquals(byKey.get(k)?.idempotent, false, k);
  }
});

Deno.test("index: every required param carries a label and every select has options", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(p.label && p.label.length > 0, `${a.key}.${p.key}: no label`);
      if (p.type === "select") {
        assert(
          ((p.options as unknown[] | undefined)?.length ?? 0) > 0,
          `${a.key}.${p.key}: no options`,
        );
      }
    }
  }
});

Deno.test("index: auth and health checks are wired", () => {
  assertEquals(app.auth[0].key, "api-token");
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "api", "quota"]);
});
