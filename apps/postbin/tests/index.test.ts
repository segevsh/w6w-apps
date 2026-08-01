import { assert, assertEquals } from "@std/assert";
import type { AppDefinition } from "@w6w/types";
import app from "../index.ts";

Deno.test("index: exposes exactly the expected action keys, each unique", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(
    keys.sort(),
    ["create-bin", "get-bin", "delete-bin", "get-request", "shift-request"].sort(),
  );
  assertEquals(new Set(keys).size, keys.length);
});

Deno.test("index: declares no auth methods — PostBin is a genuinely no-auth service", () => {
  assertEquals((app as AppDefinition).auth, undefined);
});

Deno.test("index: declares the service and quota health checks", () => {
  assertEquals(app.healthChecks?.map((h) => h.key).sort(), ["quota", "service"]);
});

Deno.test("index: every action declares a type and a title", () => {
  for (const action of app.actions) {
    assert(["read", "search", "perform", "control"].includes(action.type));
    assert(action.title.length > 0);
  }
});

Deno.test("index: every perform action declares idempotent explicitly", () => {
  for (const action of app.actions) {
    if (action.type === "perform") {
      assertEquals(typeof action.idempotent, "boolean");
    }
  }
});

Deno.test("index: every action requiring no auth-derived requiresAuth flag stays default", () => {
  // With no Auth declared, `requiresAuth` should not be explicitly set to true
  // on any action — there's no Connection to require.
  for (const action of app.actions) {
    assert(action.requiresAuth !== true);
  }
});
