import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";
import pkg from "../package.json" with { type: "json" };

const ACTION_COUNT = 30;

Deno.test("index: exports actions, one oauth2 method and two health checks", () => {
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 1);
  assertEquals(app.auth[0].key, "oauth2");
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
    assert(Array.isArray(a.output) && a.output.length > 0, a.key);
    assertEquals(typeof a.execute, "function", a.key);
  }
});

Deno.test("index: every param has a key and a label", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) assert(p.key && p.label, `${a.key}: ${JSON.stringify(p.key)}`);
  }
});

Deno.test("index: every perform declares idempotency; creates are not retryable", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", a.key);
  }
  for (
    const key of [
      "room-create",
      "mural-create",
      "mural-duplicate",
      "sticky-note-create",
      "textbox-create",
      "comment-create",
      "tag-create",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
  for (const key of ["room-delete", "mural-delete", "widget-delete", "mural-update"]) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, true, key);
  }
});

Deno.test("index: no param is named like a credential", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!/token|password|secret/i.test(p.key), `${a.key}/${p.key}`);
    }
  }
});

Deno.test("index: manifest declares only the API host and validates its shape", () => {
  assertEquals(pkg.w6w.network.allow, ["app.mural.co"]);
  assertEquals(pkg.w6w.id, "io.w6w.mural");
  assert(pkg.w6w.categories.length >= 1 && pkg.w6w.categories.length <= 3);
});
