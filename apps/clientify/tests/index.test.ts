import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 27;

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 1);
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "api", "quota"]);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const key of keys) assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
});

Deno.test("index: every action has a valid type, description and execute hook", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type`);
    assert(
      typeof a.description === "string" && a.description.length > 0,
      `${a.key}: no description`,
    );
    assertEquals(typeof a.execute, "function", `${a.key}: no execute`);
  }
});

Deno.test("index: every perform action states idempotency explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
});

Deno.test("index: creates and notes are never marked idempotent; deletes are", () => {
  for (const a of app.actions) {
    if (/-create$|-add-note$/.test(a.key)) assertEquals(a.idempotent, false, a.key);
    if (/-delete$/.test(a.key)) assertEquals(a.idempotent, true, a.key);
  }
});

Deno.test("index: no action carries a credential header", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(
        !/authorization|token|api.?key/i.test(p.key),
        `${a.key}: credential-like param ${p.key}`,
      );
    }
  }
});

Deno.test("index: single auth method is an apiKey with Token prefix", () => {
  assertEquals(app.auth[0].key, "api-key");
  assertEquals(app.auth[0].type, "apiKey");
});
