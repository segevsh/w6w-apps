import { test } from "node:test";
import { assertEquals, assertExists } from "./_assert.ts";
import app from "../index.ts";

test("index: exports 13 actions, one auth method, and two health checks", () => {
  assertEquals(app.actions.length, 13);
  assertEquals(app.auth?.map((a) => a.key), ["oauth2"]);
  assertEquals(app.healthChecks?.map((h) => h.key), ["service", "quota"]);
});

test("index: every action key is unique kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const key of keys) {
    assertEquals(/^[a-z][a-z0-9-]*$/.test(key), true, `"${key}" is not kebab-case`);
  }
});

test("index: every action declares execute and a valid type", () => {
  for (const action of app.actions) {
    assertExists(action.execute, `${action.key} is missing execute`);
    assertEquals(["read", "search", "perform", "control"].includes(action.type), true);
  }
});

test("index: perform actions declare `idempotent` explicitly", () => {
  for (const action of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof action.idempotent, "boolean", `${action.key} must declare idempotent`);
  }
});

test("index: the requested action set is present", () => {
  const keys = new Set(app.actions.map((a) => a.key));
  for (
    const key of [
      "list-conversations",
      "get-conversation",
      "create-conversation",
      "update-conversation",
      "add-reply",
      "add-note",
      "list-mailboxes",
      "list-customers",
      "get-customer",
      "create-customer",
      "update-customer",
      "get-current-user",
      "list-tags",
    ]
  ) {
    assertEquals(keys.has(key), true, `missing action "${key}"`);
  }
});
