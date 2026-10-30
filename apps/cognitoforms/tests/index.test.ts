import { test } from "node:test";
import { assert, assertEquals } from "./_assert.ts";
import app from "../index.ts";

test("index: exposes exactly the expected action keys, each unique", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(
    keys.sort(),
    [
      "form-get-many",
      "form-get-schema",
      "form-public-link-availability-set",
      "entry-create",
      "entry-get",
      "entry-update",
      "entry-delete",
      "entries-import",
      "import-status-get",
      "entry-document-get",
      "file-upload",
      "entry-file-get",
    ].sort(),
  );
  assertEquals(new Set(keys).size, keys.length);
});

test("index: declares the bearer-token auth method", () => {
  assertEquals(app.auth?.map((a) => a.key), ["bearer-token"]);
});

test("index: declares the service health check", () => {
  assertEquals(app.healthChecks?.map((h) => h.key), ["service"]);
});

test("index: every action declares a type and a title", () => {
  for (const action of app.actions) {
    assert(["read", "search", "perform", "control"].includes(action.type));
    assert(action.title.length > 0);
  }
});

test("index: every action declares output fields", () => {
  for (const action of app.actions) {
    assert(action.output, `${action.key} declares no output`);
  }
});

test("index: every perform action declares idempotent explicitly", () => {
  for (const action of app.actions) {
    if (action.type === "perform") {
      assertEquals(typeof action.idempotent, "boolean", `${action.key}`);
    }
  }
});

test("index: no action sets an auth header itself", () => {
  for (const action of app.actions) {
    assertEquals(
      /authorization/i.test(action.execute.toString()),
      false,
      `${action.key} mentions an auth header`,
    );
  }
});
