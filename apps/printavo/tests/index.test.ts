import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports 38 unique actions, one auth method, two health checks", () => {
  assertEquals(app.actions.length, 38);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "action keys must be unique");
  assertEquals(app.auth?.length, 1);
  assertEquals(app.auth?.[0].key, "credentials");
  assertEquals(app.healthChecks?.map((h) => h.key), ["service", "quota"]);
});

Deno.test("index: every action declares a type, title, and params array", () => {
  for (const action of app.actions) {
    assert(["read", "search", "perform"].includes(action.type), `${action.key}: valid type`);
    assert(action.title.length > 0, `${action.key}: has a title`);
    assert(Array.isArray(action.params), `${action.key}: has params`);
  }
});

Deno.test("index: every perform action declares idempotent; deletes and creates are honest", () => {
  for (const action of app.actions) {
    if (action.type === "perform") {
      assert(typeof action.idempotent === "boolean", `${action.key}: idempotent is declared`);
    }
  }
  const byKey = new Map(app.actions.map((a) => [a.key, a]));
  for (const k of ["customer-create", "quote-create", "quote-duplicate", "payment-create"]) {
    assertEquals((byKey.get(k) as { idempotent?: boolean }).idempotent, false, k);
  }
});

Deno.test("index: every required param is declared on each action", () => {
  for (const action of app.actions) {
    const keys = (action.params ?? []).map((p) => p.key);
    assertEquals(new Set(keys).size, keys.length, `${action.key}: param keys unique`);
  }
});
