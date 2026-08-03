import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exposes exactly the expected action keys, each unique", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(
    keys.slice().sort(),
    [
      "document-get-many",
      "document-get-status",
      "document-get",
      "document-create-from-template",
      "document-send",
      "document-create-session",
      "document-change-status",
      "document-send-reminder",
      "document-download",
      "document-delete",
      "template-get-many",
      "template-get",
      "contact-get-many",
      "contact-create",
      "webhook-subscription-get-many",
      "member-get-current",
    ].sort(),
  );
  assertEquals(new Set(keys).size, keys.length);
});

Deno.test("index: declares the api-key auth method", () => {
  assertEquals(app.auth?.map((a) => a.key), ["api-key"]);
});

Deno.test("index: declares the service and quota health checks", () => {
  assertEquals(app.healthChecks?.map((h) => h.key).sort(), ["quota", "service"]);
});

Deno.test("index: every action declares a type, a title and a description", () => {
  for (const action of app.actions) {
    assert(["read", "search", "perform", "control"].includes(action.type), action.key);
    assert(action.title.length > 0, action.key);
    assert((action.description ?? "").length > 0, action.key);
  }
});

Deno.test("index: every action declares output fields", () => {
  for (const action of app.actions) {
    assert(action.output, `${action.key} declares no output`);
  }
});

Deno.test("index: every perform action declares idempotent explicitly", () => {
  for (const action of app.actions) {
    if (action.type === "perform") {
      assertEquals(typeof action.idempotent, "boolean", action.key);
    }
  }
});

Deno.test("index: no action sets an auth header itself", () => {
  for (const action of app.actions) {
    assertEquals(
      /authorization|api-key\s*\$\{/i.test(action.execute.toString()),
      false,
      `${action.key} mentions an auth header`,
    );
  }
});

Deno.test("index: every action key is kebab-case", () => {
  for (const action of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(action.key), action.key);
  }
});

Deno.test("index: every action declares a resource for editor grouping", () => {
  for (const action of app.actions) {
    assert(action.resource, `${action.key} declares no resource`);
  }
});
