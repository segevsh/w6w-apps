import { assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exposes 9 actions, 2 auth methods, 3 health checks", () => {
  assertEquals(app.actions.length, 9);
  assertEquals(app.auth?.map((a) => a.key), ["basic", "oauth2"]);
  assertEquals(app.healthChecks?.map((h) => h.key), ["service", "quota", "instance"]);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const key of keys) {
    assertEquals(/^[a-z][a-z0-9-]*$/.test(key), true, `${key} is not kebab-case`);
  }
});
