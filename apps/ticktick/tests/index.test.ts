import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";
import { API_URL } from "../lib/client.ts";
import { AUTHORIZATION_URL, TOKEN_URL } from "../auth/oauth2.ts";

Deno.test("index: exports the full action set with unique kebab-case keys", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(keys, [
    "list-projects",
    "get-project",
    "get-project-data",
    "create-project",
    "update-project",
    "delete-project",
    "get-task",
    "create-task",
    "update-task",
    "complete-task",
    "delete-task",
    "move-task",
    "filter-tasks",
    "list-completed-tasks",
    "list-focuses",
    "get-focus",
    "delete-focus",
    "list-habits",
    "get-habit",
    "create-habit",
    "update-habit",
    "checkin-habit",
    "list-habit-checkins",
  ]);
  assertEquals(new Set(keys).size, keys.length);
  for (const k of keys) assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(k), `${k} is not kebab-case`);
});

Deno.test("index: one action per documented Open API endpoint — 23", () => {
  assertEquals(app.actions.length, 23);
});

Deno.test("index: every action declares a valid type, title, description and output", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key} has type ${a.type}`);
    assert(a.title, `${a.key} has no title`);
    assert(a.description, `${a.key} has no description`);
    assert(Array.isArray(a.params), `${a.key} has no params array`);
    assert(Array.isArray(a.output) && a.output.length > 0, `${a.key} has no output`);
    assertEquals(typeof a.execute, "function", `${a.key} has no execute hook`);
  }
});

Deno.test("index: only the two parameterless list endpoints declare no params", () => {
  const paramless = app.actions.filter((a) => a.params!.length === 0).map((a) => a.key);
  assertEquals(paramless, ["list-projects", "list-habits"]);
});

Deno.test("index: every param has a unique key and a label", () => {
  for (const a of app.actions) {
    const keys = a.params!.map((p) => p.key);
    assertEquals(new Set(keys).size, keys.length, `${a.key} has duplicate param keys`);
    for (const p of a.params!) assert(p.label, `${a.key}.${p.key} has no label`);
  }
});

Deno.test("index: every action is grouped under one of the four TickTick resources", () => {
  const resources = new Set(app.actions.map((a) => a.resource));
  assertEquals([...resources].sort(), ["focus", "habit", "project", "task"]);
});

Deno.test("index: every perform action declares idempotent honestly", () => {
  for (const a of app.actions.filter((x) => x.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key} does not declare idempotent`);
  }
  // The three that mint a fresh server-side id are the only non-idempotent ones.
  const nonIdempotent = app.actions
    .filter((a) => a.type === "perform" && a.idempotent === false)
    .map((a) => a.key);
  assertEquals(nonIdempotent, ["create-project", "create-task", "create-habit"]);
});

Deno.test("index: every task action addressed through a project requires both ids", () => {
  // Create is the exception: it carries projectId in the body, not the path.
  const throughProject = ["get-task", "complete-task", "delete-task", "update-task"];
  for (const key of throughProject) {
    const a = app.actions.find((x) => x.key === key)!;
    assert(a.params!.find((p) => p.key === "projectId")?.required, `${key} needs projectId`);
    assert(a.params!.find((p) => p.key === "taskId")?.required, `${key} needs taskId`);
  }
});

Deno.test("index: exports oauth2 as the only auth method, with sign and test", () => {
  assertEquals(app.auth.map((a) => a.key), ["oauth2"]);
  assertEquals(app.auth[0].type, "oauth2");
  assertEquals(typeof app.auth[0].test, "function");
  assertEquals(typeof app.auth[0].sign, "function");
  assertEquals(app.auth[0].fields, undefined);
});

Deno.test("index: exports the service and quota health checks", () => {
  assertEquals(app.healthChecks!.map((h) => h.key), ["service", "quota"]);
});

Deno.test("index: every declared-absent health check is informational", () => {
  // An `unavailable` entry always reports `unknown`; at the default `degraded`
  // severity it would pin the app's roll-up verdict there permanently.
  for (const h of app.healthChecks!) {
    if (h.unavailable) {
      assertEquals(h.severity, "informational", `${h.key} is unavailable but not informational`);
      assert(h.unavailable.reason, `${h.key} declares no reason`);
    }
  }
});

Deno.test("index: the base is the documented Open API host, and OAuth lives elsewhere", () => {
  assertEquals(API_URL, "https://api.ticktick.com/open/v1");
  // The two hosts are genuinely different; only the API host is on the manifest
  // allowlist, because the token exchange happens host-side.
  assert(AUTHORIZATION_URL.startsWith("https://ticktick.com/"));
  assert(TOKEN_URL.startsWith("https://ticktick.com/"));
  assert(!API_URL.startsWith("https://ticktick.com/"));
});

Deno.test("index: no action reaches for an undocumented private endpoint", () => {
  // TickTick's web app is backed by /api/v2/* — used by several third-party
  // libraries, and deliberately absent here. Nothing in this App may name it.
  const source = JSON.stringify(app.actions.map((a) => ({ k: a.key, t: a.title })));
  assert(!source.includes("/api/v2"));
  assert(!API_URL.includes("/api/v2"));
});
