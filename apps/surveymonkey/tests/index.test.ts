import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exposes exactly the expected action keys, each unique", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(
    keys.sort(),
    [
      "survey-get-many",
      "survey-get",
      "survey-get-details",
      "survey-create",
      "response-get-many",
      "response-get-details",
      "collector-get-many",
      "collector-create",
      "page-get-many",
      "user-get",
      "contact-list-get-many",
      "contact-create",
    ].sort(),
  );
  assertEquals(new Set(keys).size, keys.length);
});

Deno.test("index: declares the oauth2 auth method", () => {
  assertEquals(app.auth?.map((a) => a.key), ["oauth2"]);
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
