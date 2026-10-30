import { test } from "node:test";
import { assertEquals } from "./_assert.ts";
import app from "../index.ts";

test("index: declares 11 actions with unique kebab-case keys", () => {
  assertEquals(app.actions.length, 11);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const key of keys) {
    assertEquals(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), true, `${key} is not kebab-case`);
  }
});

test("index: declares exactly one auth method, api-token", () => {
  assertEquals(app.auth?.length, 1);
  assertEquals(app.auth?.[0].key, "api-token");
});

test("index: declares two health checks", () => {
  assertEquals(app.healthChecks?.map((h) => h.key).sort(), ["quota", "service"]);
});

test("index: every perform action declares idempotent", () => {
  for (const a of app.actions) {
    if (a.type === "perform") {
      assertEquals(typeof a.idempotent, "boolean", `${a.key} does not declare idempotent`);
    }
  }
});

test("index: every action requires auth (no public endpoints in this app)", () => {
  const optedOut = app.actions.filter((a) => a.requiresAuth === false).map((a) => a.key);
  assertEquals(optedOut, []);
});

test("index: every action declares a description and output", () => {
  for (const a of app.actions) {
    assertEquals(typeof a.description, "string", `${a.key} has no description`);
    assertEquals(!!a.description, true, `${a.key} has an empty description`);
    assertEquals(!!a.output, true, `${a.key} declares no output`);
  }
});

test("index: every action groups under the 'transcript' resource", () => {
  for (const a of app.actions) {
    assertEquals(a.resource, "transcript", `${a.key} is not grouped under 'transcript'`);
  }
});
