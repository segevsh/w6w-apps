import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: one oauth2 auth method, nine actions, two health checks", () => {
  assertEquals(app.auth?.map((a) => a.key), ["oauth2"]);
  assertEquals(app.actions.length, 9);
  assertEquals(app.healthChecks?.map((h) => h.key), ["service", "quota"]);
});

Deno.test("index: action keys are the documented set and unique", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  assertEquals(keys, [
    "list-ad-accounts",
    "list-custom-audiences",
    "get-custom-audience",
    "create-custom-audience",
    "update-custom-audience",
    "delete-custom-audience",
    "add-users",
    "remove-users",
    "create-lookalike-audience",
  ]);
});

Deno.test("index: every action has title, type, description, output and execute", () => {
  for (const action of app.actions) {
    assertEquals(typeof action.title, "string");
    assertEquals(typeof action.description, "string");
    assertEquals(typeof action.execute, "function");
    assert(Array.isArray(action.output), `${action.key} declares no output`);
  }
});

Deno.test("index: every perform action declares idempotent honestly", () => {
  const idem = Object.fromEntries(
    app.actions.filter((a) => a.type === "perform").map((a) => [a.key, a.idempotent]),
  );
  assertEquals(idem, {
    "create-custom-audience": false,
    "update-custom-audience": true,
    "delete-custom-audience": false,
    "add-users": true,
    "remove-users": true,
    "create-lookalike-audience": false,
  });
});

Deno.test("index: both upload actions offer the hashing control defaulting to auto", () => {
  for (const key of ["add-users", "remove-users"]) {
    const hashing = app.actions.find((a) => a.key === key)!.params?.find((p) =>
      p.key === "hashing"
    );
    assertEquals(hashing?.default, "auto");
  }
});
