import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 24;

Deno.test("index: exports actions, auth and health checks", () => {
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 1);
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "api", "quota"]);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const key of keys) assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
});

Deno.test("index: every action declares a valid type, description, output and execute hook", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type`);
    assert(typeof a.description === "string" && a.description.length > 0, `${a.key}: description`);
    assertEquals(typeof a.execute, "function", `${a.key}: no execute`);
    assert(Array.isArray(a.output), `${a.key}: no output`);
  }
});

Deno.test("index: every perform action states idempotency; creators are not retryable", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
  for (const key of ["candidate-create", "company-create", "contact-create", "note-create"]) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

Deno.test("index: every param has a key and a label, and keys are unique per action", () => {
  for (const a of app.actions) {
    const keys = (a.params ?? []).map((p) => p.key);
    assertEquals(new Set(keys).size, keys.length, `${a.key}: duplicate param`);
    for (const p of a.params ?? []) assert(p.key && p.label, `${a.key}: param without key/label`);
  }
});

Deno.test("index: no action carries a credential parameter", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(p.type !== "secret" && !/token|authorization/i.test(p.key), `${a.key}: ${p.key}`);
    }
  }
});
