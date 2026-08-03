import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const EXPECTED_KEYS = [
  "user-get",
  "workspace-get-many",
  "workspace-get",
  "workspace-create",
  "workspace-update",
  "workspace-delete",
  "folder-get-many",
  "folder-create",
  "folder-update",
  "folder-delete",
  "form-get-many",
  "form-get",
  "form-create",
  "form-update",
  "form-delete",
  "question-get-many",
  "question-update",
  "block-get-many",
  "block-update-many",
  "submission-get-many",
  "submission-get",
  "submission-delete",
  "analytics-get-metrics",
  "analytics-get-visits",
  "analytics-get-submissions",
  "analytics-get-dimensions",
  "analytics-get-drop-off",
  "webhook-get-many",
  "webhook-create",
  "webhook-update",
  "webhook-delete",
  "webhook-event-get-many",
  "webhook-event-retry",
  "organization-user-get-many",
  "organization-user-remove",
  "organization-invite-get-many",
  "organization-invite-create",
  "organization-invite-cancel",
];

Deno.test("index: exposes exactly the expected action keys, each unique", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(keys.slice().sort(), EXPECTED_KEYS.slice().sort());
  assertEquals(new Set(keys).size, keys.length);
});

Deno.test("index: covers all 38 operations Tally's OpenAPI declares", () => {
  assertEquals(app.actions.length, 38);
});

Deno.test("index: declares the api-key auth method", () => {
  assertEquals(app.auth?.map((a) => a.key), ["api-key"]);
});

Deno.test("index: declares the service and quota health checks", () => {
  assertEquals(app.healthChecks?.map((h) => h.key).sort(), ["quota", "service"]);
});

Deno.test("index: every action declares a type and a title", () => {
  for (const action of app.actions) {
    assert(["read", "search", "perform", "control"].includes(action.type), action.key);
    assert(action.title.length > 0, action.key);
  }
});

Deno.test("index: every action declares output fields", () => {
  for (const action of app.actions) {
    assert(action.output, `${action.key} declares no output`);
  }
});

Deno.test("index: every action key is kebab-case", () => {
  for (const action of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(action.key), action.key);
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
      /authorization|bearer/i.test(action.execute.toString()),
      false,
      `${action.key} mentions an auth header`,
    );
  }
});

Deno.test("index: every action declares a resource", () => {
  for (const action of app.actions) {
    assert(action.resource, `${action.key} declares no resource`);
  }
});

Deno.test("index: every required param carries a label", () => {
  for (const action of app.actions) {
    for (const param of action.params ?? []) {
      assert(param.label, `${action.key}.${param.key} has no label`);
    }
  }
});
