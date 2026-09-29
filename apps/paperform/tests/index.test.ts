import { assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: declares 25 actions with unique kebab-case keys", () => {
  assertEquals(app.actions.length, 25);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const key of keys) {
    assertEquals(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), true, `${key} is not kebab-case`);
  }
});

Deno.test("index: declares exactly one auth method, api-key", () => {
  assertEquals(app.auth?.length, 1);
  assertEquals(app.auth?.[0].key, "api-key");
});

Deno.test("index: declares two health checks", () => {
  assertEquals(app.healthChecks?.map((h) => h.key).sort(), ["request-rate", "service"]);
});

Deno.test("index: every perform action declares idempotent", () => {
  for (const a of app.actions) {
    if (a.type === "perform") {
      assertEquals(typeof a.idempotent, "boolean", `${a.key} does not declare idempotent`);
    }
  }
});

Deno.test("index: every action declares a description and output", () => {
  for (const a of app.actions) {
    assertEquals(typeof a.description, "string", `${a.key} has no description`);
    assertEquals(!!a.description, true, `${a.key} has an empty description`);
    assertEquals(!!a.output, true, `${a.key} declares no output`);
  }
});

Deno.test("index: no action requires auth explicitly opted out (every action needs the connection)", () => {
  const optedOut = app.actions.filter((a) => a.requiresAuth === false).map((a) => a.key);
  assertEquals(optedOut, []);
});
