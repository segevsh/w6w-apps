import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports 70 actions, one auth method and three health checks", () => {
  assertEquals(app.actions.length, 70);
  assertEquals(app.auth.length, 1);
  assertEquals(app.auth[0].key, "api-key");
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "api", "quota"]);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const key of keys) assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
});

Deno.test("index: every action has a type, description, resource and execute hook", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type`);
    assert(a.description && a.description.length > 0, `${a.key}: no description`);
    assert(a.resource, `${a.key}: no resource`);
    assertEquals(typeof a.execute, "function", `${a.key}: no execute`);
  }
});

Deno.test("index: every read and search action declares an output", () => {
  for (const a of app.actions.filter((x) => x.type !== "perform")) {
    assert(Array.isArray(a.output) && a.output.length > 0, `${a.key}: no output`);
  }
});

Deno.test("index: param keys are unique per action and every param has a label", () => {
  for (const a of app.actions) {
    const keys = (a.params ?? []).map((p) => p.key);
    assertEquals(new Set(keys).size, keys.length, `${a.key}: duplicate param`);
    for (const p of a.params ?? []) assert(p.label, `${a.key}.${p.key}: no label`);
  }
});

Deno.test("index: every perform action states idempotency; records and creates are not", () => {
  for (const a of app.actions.filter((x) => x.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", a.key);
  }
  const byKey = new Map(app.actions.map((a) => [a.key, a]));
  for (
    const k of [
      "petition-create",
      "event-create",
      "form-create",
      "message-create",
      "donation-record",
      "outreach-record",
      "message-send",
    ]
  ) {
    assertEquals(byKey.get(k)?.idempotent, false, k);
  }
  for (
    const k of [
      "person-signup",
      "person-update",
      "tag-create",
      "signature-record",
      "attendance-record",
      "submission-record",
      "tagging-create",
      "tagging-delete",
    ]
  ) {
    assertEquals(byKey.get(k)?.idempotent, true, k);
  }
});

Deno.test("index: the app never declares an action that deletes a person or a page", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(keys.filter((k) => k.endsWith("-delete")), ["tagging-delete"]);
});
