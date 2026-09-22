import { assertEquals, assertExists } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports 21 actions, two auth methods and three health checks", () => {
  assertEquals(app.actions.length, 21);
  assertEquals(app.auth?.map((a) => a.key), ["api-key", "user-token"]);
  assertEquals(app.healthChecks?.map((h) => h.key), ["subdomain", "service", "quota"]);
});

Deno.test("index: every action key is unique kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const key of keys) {
    assertEquals(/^[a-z][a-z0-9-]*$/.test(key), true, `"${key}" is not kebab-case`);
  }
});

Deno.test("index: every action declares execute and a valid type", () => {
  for (const action of app.actions) {
    assertExists(action.execute, `${action.key} is missing execute`);
    assertEquals(
      ["read", "search", "perform", "control"].includes(action.type),
      true,
      `${action.key} has type ${action.type}`,
    );
  }
});

Deno.test("index: perform actions declare `idempotent` explicitly", () => {
  for (const action of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof action.idempotent, "boolean", `${action.key} must declare idempotent`);
  }
});

Deno.test("index: every action declares an output", () => {
  for (const action of app.actions) {
    assertEquals(Array.isArray(action.output), true, `${action.key} declares no output`);
  }
});

Deno.test("index: both auth methods expose the subdomain on the Connection", () => {
  for (const method of app.auth ?? []) {
    assertEquals(method.fields?.[0].key, "subdomain", `${method.key} must collect the subdomain`);
    assertEquals(method.fields?.[0].required, true);
    assertEquals(typeof method.sign, "function");
    assertEquals(typeof method.test, "function");
    assertEquals(typeof method.afterConnect, "function");
  }
});

Deno.test("index: the declared checks match the app's health surface", () => {
  const byKey = new Map(app.healthChecks?.map((h) => [h.key, h]));
  // The dependency probe is live and per-connection; the other two are declared
  // absences with an informational severity, so a roll-up never sits at unknown.
  assertEquals(byKey.get("subdomain")?.kind, "dependency");
  assertEquals(byKey.get("subdomain")?.scope, "connection");
  assertEquals(byKey.get("subdomain")?.credential, "context");
  assertEquals(typeof byKey.get("subdomain")?.check, "function");
  for (const key of ["service", "quota"]) {
    assertEquals(byKey.get(key)?.severity, "informational", `${key} must be informational`);
    assertEquals(byKey.get(key)?.unavailable !== undefined, true, `${key} must declare absence`);
    assertEquals(byKey.get(key)?.check, undefined, `${key} must not also declare a hook`);
  }
});
