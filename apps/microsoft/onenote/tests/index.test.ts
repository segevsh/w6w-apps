import { test } from "node:test";
import { assert, assertEquals } from "./_assert.ts";
import app from "../index.ts";

test("index: exposes every action with a unique kebab-case key", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(keys.length, 15);
  assertEquals(new Set(keys).size, keys.length, "action keys must be unique");
  for (const key of keys) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `${key} is not kebab-case`);
  }
});

test("index: every action declares a description, output and a valid type", () => {
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

test("index: every perform action states whether it is idempotent", () => {
  for (const action of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(
      typeof action.idempotent,
      "boolean",
      `${action.key} does not declare idempotent`,
    );
  }
});

test("index: only Delete Page converges to the same end state — everything else mints something new", () => {
  const idempotent = app.actions
    .filter((a) => a.type === "perform" && a.idempotent)
    .map((a) => a.key)
    .sort();
  assertEquals(idempotent, ["delete-page"]);
});

test("index: every create/update perform action is marked not idempotent", () => {
  const notIdempotent = app.actions
    .filter((a) => a.type === "perform" && !a.idempotent)
    .map((a) => a.key)
    .sort();
  assertEquals(notIdempotent, [
    "create-notebook",
    "create-page",
    "create-section",
    "create-section-group",
    "update-page-content",
  ]);
});

test("index: declares the oauth2 auth method only", () => {
  assertEquals(app.auth.map((a) => a.key), ["oauth2"]);
});

test("index: declares the service and quota health checks, both declared absent", () => {
  assertEquals(app.healthChecks?.map((h) => h.key), ["service", "quota"]);
  assertEquals(app.healthChecks?.every((h) => !!h.unavailable), true);
});

test("index: actions are grouped under a resource", () => {
  const resources = new Set(app.actions.map((a) => a.resource));
  assertEquals(
    [...resources].sort(),
    ["notebook", "page", "section", "section-group"],
  );
});

test("index: a notebook/section/section-group resource offers no update/delete — the reference documents none", () => {
  const nonPageActions = app.actions.filter((a) => a.resource !== "page").map((a) => a.key).sort();
  assertEquals(nonPageActions, [
    "create-notebook",
    "create-section",
    "create-section-group",
    "get-notebook",
    "get-section",
    "get-section-group",
    "list-notebooks",
    "list-section-groups",
    "list-sections",
  ]);
  // Only Create + List + Get for each — no rename/update/delete action key exists.
  for (const key of nonPageActions) {
    assert(
      key.startsWith("create-") || key.startsWith("get-") || key.startsWith("list-"),
      `${key} looks like an update/delete action that shouldn't exist for this resource`,
    );
  }
});

test("index: only the page resource supports update and delete", () => {
  const pageActions = app.actions.filter((a) => a.resource === "page").map((a) => a.key).sort();
  assertEquals(pageActions, [
    "create-page",
    "delete-page",
    "get-page",
    "get-page-content",
    "list-pages",
    "update-page-content",
  ]);
});

test("index: every action offers Location, even a me-only flow — Location ID only matters past 'me'", () => {
  for (const action of app.actions) {
    const keys = (action.params ?? []).map((p) => p.key);
    assert(keys.includes("location"), `${action.key} has no Location param`);
    assert(keys.includes("locationId"), `${action.key} has no Location ID param`);
  }
});

test("index: every credential-shaped param is a secret", () => {
  const suspicious: string[] = [];
  for (const action of app.actions) {
    for (const param of action.params ?? []) {
      if (!/password|secret|apikey|api-key|credential/i.test(param.key)) continue;
      if (param.type !== "secret" && !param.secret) {
        suspicious.push(`${action.key}.${param.key}`);
      }
    }
  }
  assertEquals(suspicious, []);
});

test("index: create-page and update-page-content are the only actions with a body-shaped param carrying HTML/commands", () => {
  const htmlActions = app.actions
    .filter((a) => (a.params ?? []).some((p) => p.key === "content" || p.key === "commands"))
    .map((a) => a.key)
    .sort();
  assertEquals(htmlActions, ["create-page", "update-page-content"]);
});
