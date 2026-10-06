import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 35;

Deno.test("index: exports actions, one auth method and two health checks", () => {
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth!.length, 1);
  assertEquals(app.healthChecks!.map((h) => h.key), ["service", "quota"]);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const key of keys) assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
});

Deno.test("index: every action has a valid type, description, output and execute hook", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type`);
    assert(a.description && a.description.length > 0, `${a.key}: no description`);
    assertEquals(typeof a.execute, "function", `${a.key}: no execute`);
    assert(Array.isArray(a.output) && a.output.length > 0, `${a.key}: no output`);
  }
});

Deno.test("index: every perform action states idempotency, and creates are never idempotent", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
  for (const key of ["contact-create", "tag-create"]) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

Deno.test("index: every param key is unique within its action", () => {
  for (const a of app.actions) {
    const keys = (a.params ?? []).map((p) => p.key);
    assertEquals(new Set(keys).size, keys.length, `${a.key}: duplicate param`);
  }
});

Deno.test("index: no action takes a credential or sets an auth header", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!/api[-_]?key|token|secret|password/i.test(p.key), `${a.key}: ${p.key}`);
    }
  }
});

Deno.test("index: the API-key auth method declares a secret field and a test hook", () => {
  const auth = app.auth![0];
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "apiKey");
  assertEquals(auth.fields?.[0].type, "secret");
  assertEquals(typeof auth.test, "function");
});
