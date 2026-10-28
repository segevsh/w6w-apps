import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports the full action set with unique kebab-case keys", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(keys, [
    "list-task-lists",
    "get-task-list",
    "create-task-list",
    "update-task-list",
    "delete-task-list",
    "list-tasks",
    "get-task",
    "create-task",
    "update-task",
    "complete-task",
    "delete-task",
    "move-task",
    "clear-completed-tasks",
  ]);
  assertEquals(new Set(keys).size, keys.length);
  for (const k of keys) assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(k), `${k} is not kebab-case`);
});

Deno.test("index: every action declares a valid type, description, params and output", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key} has type ${a.type}`);
    assert(a.title, `${a.key} has no title`);
    assert(a.description, `${a.key} has no description`);
    assert(Array.isArray(a.params) && a.params.length > 0, `${a.key} has no params`);
    assert(Array.isArray(a.output) && a.output.length > 0, `${a.key} has no output`);
    assertEquals(typeof a.execute, "function", `${a.key} has no execute hook`);
  }
});

Deno.test("index: every perform action declares idempotent honestly", () => {
  for (const a of app.actions.filter((x) => x.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key} does not declare idempotent`);
  }
  // The two that mint a new server-side id are the only non-idempotent ones.
  const nonIdempotent = app.actions
    .filter((a) => a.type === "perform" && a.idempotent === false)
    .map((a) => a.key);
  assertEquals(nonIdempotent, ["create-task-list", "create-task"]);
});

Deno.test("index: exports oauth2 as the only auth method, with a test hook", () => {
  assertEquals(app.auth.map((a) => a.key), ["oauth2"]);
  assertEquals(app.auth[0].type, "oauth2");
  assertEquals(typeof app.auth[0].test, "function");
  assertEquals(typeof app.auth[0].sign, "function");
  // No `fields` — an OAuth2 method collects nothing at connect time.
  assertEquals(app.auth[0].fields, undefined);
});

Deno.test("index: exports the service and quota health checks", () => {
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "quota"]);
});

Deno.test("index: every task-scoped action takes a task list ID", () => {
  for (const a of app.actions) {
    if (a.key === "list-task-lists" || a.key === "create-task-list") continue;
    const p = a.params!.find((x) => x.key === "taskList");
    assert(p?.required, `${a.key} does not require taskList`);
  }
});
