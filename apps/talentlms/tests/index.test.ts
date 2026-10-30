import { test } from "node:test";
import { assertEquals, assertExists } from "./_assert.ts";
import app from "../index.ts";

test("index: exports 45 actions, one auth method, and two health checks", () => {
  assertEquals(app.actions.length, 45);
  assertEquals(app.auth?.map((a) => a.key), ["api-key"]);
  assertEquals(app.healthChecks?.map((h) => h.key), ["service", "quota"]);
});

test("index: every action key is unique kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const key of keys) {
    assertEquals(/^[a-z][a-z0-9-]*$/.test(key), true, `"${key}" is not kebab-case`);
  }
});

test("index: every action declares execute, a valid type and a resource", () => {
  for (const action of app.actions) {
    assertExists(action.execute, `${action.key} is missing execute`);
    assertEquals(["read", "search", "perform", "control"].includes(action.type), true);
    assertExists(action.resource, `${action.key} is missing resource`);
  }
});

test("index: perform actions declare `idempotent` explicitly", () => {
  for (const action of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof action.idempotent, "boolean", `${action.key} must declare idempotent`);
  }
});

test("index: no action asks for a domain or a credential — those live on the Connection", () => {
  for (const action of app.actions) {
    const keys = (action.params ?? []).map((p) => p.key);
    assertEquals(keys.includes("domain"), false, `${action.key} collects a domain`);
    assertEquals(keys.includes("apiKey"), false, `${action.key} collects a credential`);
  }
});
