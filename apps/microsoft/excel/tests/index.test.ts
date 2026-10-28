import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exposes every action with a unique kebab-case key", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(keys.length, 16);
  assertEquals(new Set(keys).size, keys.length, "action keys must be unique");
  for (const key of keys) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `${key} is not kebab-case`);
  }
});

Deno.test("index: every action declares a description, output and a valid type", () => {
  for (const action of app.actions) {
    assert(action.description, `${action.key} is missing a description`);
    assert(action.output, `${action.key} declares no output`);
    assert(
      ["read", "search", "perform"].includes(action.type),
      `${action.key} has an unexpected type ${action.type}`,
    );
    assert(typeof action.execute === "function", `${action.key} has no execute hook`);
  }
});

Deno.test("index: every perform action states whether it is idempotent", () => {
  for (const action of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(
      typeof action.idempotent,
      "boolean",
      `${action.key} does not declare idempotent`,
    );
  }
});

Deno.test("index: only the converging writes claim idempotency", () => {
  const idempotent = app.actions
    .filter((a) => a.type === "perform" && a.idempotent)
    .map((a) => a.key)
    .sort();
  // These describe an end state and replay onto the same one. Everything else
  // — create-session, add-worksheet, add-table, add-table-rows — mints or
  // appends a second copy, and Graph offers no dedupe key on any of them.
  assertEquals(idempotent, [
    "clear-range",
    "close-session",
    "delete-worksheet",
    "update-range",
    "update-worksheet",
  ]);
});

Deno.test("index: every action that mints or appends is marked non-idempotent", () => {
  const notIdempotent = app.actions
    .filter((a) => a.type === "perform" && !a.idempotent)
    .map((a) => a.key)
    .sort();
  assertEquals(notIdempotent, [
    "add-table",
    "add-table-rows",
    "add-worksheet",
    "create-session",
  ]);
});

Deno.test("index: declares the oauth2 auth method only", () => {
  assertEquals(app.auth.map((a) => a.key), ["oauth2"]);
});

Deno.test("index: declares the service and quota health checks", () => {
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "quota"]);
});

Deno.test("index: actions are grouped under a resource", () => {
  const resources = new Set(app.actions.map((a) => a.resource));
  assertEquals(
    [...resources].sort(),
    ["chart", "range", "table", "workbook", "worksheet"],
  );
});

Deno.test("index: every workbook-scoped action offers both addressing forms", () => {
  // List Workbooks is the discovery action and addresses no workbook itself.
  for (const action of app.actions.filter((a) => a.key !== "list-workbooks")) {
    const keys = (action.params ?? []).map((p) => p.key);
    assert(keys.includes("itemId"), `${action.key} cannot be addressed by item id`);
    assert(keys.includes("itemPath"), `${action.key} cannot be addressed by path`);
  }
});

Deno.test("index: every action that can run inside a session accepts a session id", () => {
  // list-workbooks is a Drive call, not a workbook call. create-session is the
  // one that *mints* the id, so taking one would be nonsense.
  const exempt = new Set(["list-workbooks", "create-session"]);
  for (const action of app.actions.filter((a) => !exempt.has(a.key))) {
    const keys = (action.params ?? []).map((p) => p.key);
    assert(keys.includes("sessionId"), `${action.key} takes no session id`);
  }
});

Deno.test("index: close-session is the only action where the session id is required", () => {
  const required = app.actions
    .filter((a) => (a.params ?? []).some((p) => p.key === "sessionId" && p.required))
    .map((a) => a.key);
  assertEquals(required, ["close-session"]);
});
