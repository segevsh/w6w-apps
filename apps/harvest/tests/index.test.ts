import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exposes exactly the expected action keys, each unique", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(
    keys.sort(),
    [
      "time-entry-get-many",
      "time-entry-get",
      "time-entry-create",
      "time-entry-update",
      "time-entry-delete",
      "time-entry-restart",
      "time-entry-stop",
      "project-get-many",
      "task-get-many",
      "client-get-many",
      "user-get-many",
    ].sort(),
  );
  assertEquals(new Set(keys).size, keys.length);
});

Deno.test("index: declares both auth methods", () => {
  assertEquals(
    app.auth?.map((a) => a.key).sort(),
    ["oauth2", "personal-access-token"].sort(),
  );
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
