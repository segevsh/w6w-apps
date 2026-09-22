import { assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports 18 actions with unique keys", () => {
  assertEquals(app.actions.length, 18);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
});

Deno.test("index: exports the oauth2 and service-account auth methods", () => {
  assertEquals(app.auth?.map((a) => a.key), ["oauth2", "service-account"]);
});

Deno.test("index: exports the service and quota health checks", () => {
  const checks = app.healthChecks ?? [];
  assertEquals(checks.map((c) => c.key).sort(), ["quota", "service"]);
});

Deno.test("index: every action key is kebab-case and its type is valid", () => {
  const validTypes = new Set(["read", "search", "perform", "control"]);
  for (const action of app.actions) {
    assertEquals(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(action.key), true, `bad key: ${action.key}`);
    assertEquals(validTypes.has(action.type), true, `bad type on ${action.key}`);
  }
});

Deno.test("index: every action declares a description and output fields", () => {
  for (const action of app.actions) {
    assertEquals(typeof action.description, "string", `${action.key} missing description`);
    assertEquals(Array.isArray(action.output), true, `${action.key} missing output`);
  }
});

Deno.test("index: every perform action declares idempotent explicitly", () => {
  for (const action of app.actions) {
    if (action.type === "perform") {
      assertEquals(typeof action.idempotent, "boolean", `${action.key} missing idempotent flag`);
    }
  }
});
