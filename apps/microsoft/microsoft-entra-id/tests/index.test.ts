import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";
import { SCOPES } from "../auth/oauth2.ts";

Deno.test("index: exposes 28 actions with unique kebab-case keys", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(keys.length, 28);
  assertEquals(new Set(keys).size, keys.length, "action keys must be unique");
  for (const key of keys) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `${key} is not kebab-case`);
  }
});

Deno.test("index: every action declares a description, output, resource and a valid type", () => {
  for (const action of app.actions) {
    assert(action.description, `${action.key} is missing a description`);
    assert(action.output, `${action.key} declares no output`);
    assert(action.resource, `${action.key} declares no resource`);
    assert(
      ["read", "search", "perform"].includes(action.type),
      `${action.key} has an unexpected type ${action.type}`,
    );
    assert(typeof action.execute === "function", `${action.key} has no execute hook`);
  }
});

Deno.test("index: every perform action states whether it is idempotent", () => {
  for (const action of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof action.idempotent, "boolean", `${action.key} does not declare idempotent`);
  }
});

Deno.test("index: creates and membership adds are the non-idempotent performs", () => {
  const nonIdempotent = app.actions
    .filter((a) => a.type === "perform" && !a.idempotent)
    .map((a) => a.key)
    .sort();
  assertEquals(nonIdempotent, [
    "add-group-member",
    "add-group-owner",
    "create-group",
    "create-user",
  ]);
});

Deno.test("index: declares the oauth2 auth method and the three health checks", () => {
  assertEquals(app.auth.map((a) => a.key), ["oauth2"]);
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "api", "quota"]);
});

Deno.test("index: every param carries a label and a type, and keys are unique per action", () => {
  for (const action of app.actions) {
    const keys = (action.params ?? []).map((p) => p.key);
    assertEquals(new Set(keys).size, keys.length, `${action.key} repeats a param key`);
    for (const param of action.params ?? []) {
      assert(param.label, `${action.key}.${param.key} has no label`);
      assert(param.type, `${action.key}.${param.key} has no type`);
    }
  }
});

Deno.test("index: every list action offers the continuation controls", () => {
  for (const action of app.actions.filter((a) => a.key.startsWith("list-"))) {
    const keys = (action.params ?? []).map((p) => p.key);
    for (const k of ["nextLink", "all", "maxPages"]) {
      assert(keys.includes(k), `${action.key} lacks ${k}`);
    }
  }
});

Deno.test("index: scopes never ask for beta/legacy surfaces and always include offline_access", () => {
  assert(SCOPES.includes("offline_access"));
  assert(!SCOPES.some((s) => s.includes("graph.windows.net")));
});
