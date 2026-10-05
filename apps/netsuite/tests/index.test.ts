import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 15;

Deno.test("index: exports actions, both auth methods and health checks", () => {
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.map((a) => a.key), ["oauth2", "tba"]);
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "account", "quota"]);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const key of keys) assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
});

Deno.test("index: every action has a valid type, description, execute hook and output", () => {
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

Deno.test("index: only the delete, update and upsert performs are marked idempotent", () => {
  const idem = app.actions.filter((a) => a.idempotent === true).map((a) => a.key).sort();
  assertEquals(idem, ["record-delete", "record-update", "record-upsert"]);
});

Deno.test("index: actions never ask for or read a credential", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(p.type !== "secret", `${a.key}.${p.key}: secret param in an action`);
    }
  }
});
