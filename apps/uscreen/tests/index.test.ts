import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 33;

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

Deno.test("index: every action has a type, description, output and execute hook", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), a.key);
    assert(a.description && a.description.length > 0, `${a.key}: no description`);
    assertEquals(typeof a.execute, "function", a.key);
    assert(Array.isArray(a.output), a.key);
  }
});

Deno.test("index: every perform action states idempotency; creates and grants are not idempotent", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
  for (
    const key of [
      "customer-create",
      "access-grant",
      "subscription-create",
      "group-create",
      "group-member-add",
      "customer-sso-link-create",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
  for (const key of ["access-revoke", "group-delete", "subscription-cancel", "content-publish"]) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, true, key);
  }
});

Deno.test("index: every param has a key and a label; no deprecated surface is exposed", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(p.key && p.label, `${a.key}: param missing key/label`);
    }
    assert(!/program|chapter/.test(a.key), `${a.key}: built on the deprecated /programs surface`);
  }
});
