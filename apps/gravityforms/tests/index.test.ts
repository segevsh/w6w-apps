import { test } from "node:test";
import { assert, assertEquals } from "./_assert.ts";
import app from "../index.ts";

const EXPECTED = [
  "form-get-many",
  "form-get",
  "form-field-filters-get",
  "form-results-get",
  "form-submit",
  "form-validate",
  "entry-get-many",
  "entry-get",
  "entry-create",
  "entry-update",
  "entry-delete",
  "entry-notifications-send",
];

test("index: exposes exactly the expected action keys, each unique", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(keys.sort(), [...EXPECTED].sort());
  assertEquals(new Set(keys).size, keys.length);
});

test("index: declares the basic auth method only", () => {
  assertEquals(app.auth?.map((a) => a.key), ["basic"]);
});

test("index: declares the service, quota and site health checks", () => {
  assertEquals(app.healthChecks?.map((h) => h.key).sort(), ["quota", "service", "site"]);
});

test("index: every action declares a valid type and a title", () => {
  for (const action of app.actions) {
    assert(["read", "search", "perform", "control"].includes(action.type), action.key);
    assert(action.title.length > 0, action.key);
    assert((action.description ?? "").length > 0, action.key);
  }
});

test("index: every action declares output fields", () => {
  for (const action of app.actions) {
    assert(action.output, `${action.key} declares no output`);
  }
});

test("index: every perform action declares idempotent explicitly", () => {
  for (const action of app.actions) {
    if (action.type === "perform") {
      assertEquals(typeof action.idempotent, "boolean", action.key);
    }
  }
});

test("index: every action is grouped under a resource", () => {
  for (const action of app.actions) {
    assert(["form", "entry"].includes(action.resource ?? ""), action.key);
  }
});

test("index: action keys are kebab-case", () => {
  for (const action of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(action.key), action.key);
  }
});

test("index: every param key is unique within its action", () => {
  for (const action of app.actions) {
    const keys = (action.params ?? []).map((p) => p.key);
    assertEquals(new Set(keys).size, keys.length, action.key);
  }
});

test("index: no action touches a credential header", () => {
  for (const action of app.actions) {
    assertEquals(
      /authorization|credential/i.test(action.execute.toString()),
      false,
      `${action.key} mentions a credential`,
    );
  }
});

test("index: no action calls the global fetch or a denied global", () => {
  for (const action of app.actions) {
    const src = action.execute.toString();
    assertEquals(/(^|[^.\w])fetch\s*\(/.test(src), false, `${action.key} calls global fetch`);
    assertEquals(/\bDeno\.[A-Za-z]/.test(src), false, `${action.key} touches Deno.*`);
  }
});
