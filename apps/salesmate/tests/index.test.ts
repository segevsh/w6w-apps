import { denoReadTextFile } from "./_deno.ts";
import { test } from "node:test";
import { assertEquals, assertExists } from "./_assert.ts";
import app from "../index.ts";

test("index: exports 28 actions, one auth method, and three health checks", () => {
  assertEquals(app.actions.length, 28);
  assertEquals(app.auth?.map((a) => a.key), ["access-token"]);
  assertEquals(app.healthChecks?.map((h) => h.key), ["service", "quota", "domain"]);
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

test("index: no action sets credential headers itself", async () => {
  for (const action of app.actions) {
    const src = await denoReadTextFile(new URL(`../actions/${action.key}.ts`, import.meta.url));
    assertEquals(/accesstoken/i.test(src), false, `${action.key} must not touch the token`);
  }
});

test("index: every unavailable health check is informational", () => {
  for (const h of app.healthChecks!) {
    if (h.unavailable) assertEquals(h.severity, "informational", h.key);
  }
});
