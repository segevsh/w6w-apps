import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  // Flodesk publishes exactly 22 documented REST operations; one Action each.
  assertEquals(app.actions.length, 22);
  assertEquals(app.auth.length, 2);
  assertEquals(app.healthChecks.length, 2);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const key of keys) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
  }
});

Deno.test("index: every action declares a valid type, a description and an execute hook", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type ${a.type}`);
    assert(
      typeof a.description === "string" && a.description.length > 0,
      `${a.key}: no description`,
    );
    assertEquals(typeof a.execute, "function", `${a.key}: no execute`);
    assert(Array.isArray(a.output), `${a.key}: no output`);
  }
});

Deno.test("index: every perform action states idempotency explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
});

Deno.test("index: every action file is named after its key", async () => {
  for (const a of app.actions) {
    const path = new URL(`../actions/${a.key}.ts`, import.meta.url);
    const stat = await Deno.stat(path);
    assert(stat.isFile, `${a.key}: no matching action file`);
  }
});

Deno.test("index: no action reads a credential — signing is the auth hook's job", async () => {
  for (const a of app.actions) {
    const src = await Deno.readTextFile(new URL(`../actions/${a.key}.ts`, import.meta.url));
    assert(!/credential/i.test(src), `${a.key}: references a credential`);
    assert(!/authorization/i.test(src), `${a.key}: sets an auth header itself`);
    assert(!/btoa|Basic /.test(src), `${a.key}: builds a Basic header itself`);
  }
});

Deno.test("index: every action covers a real, documented Flodesk endpoint", () => {
  // The 22 operations published under Flodesk's own `x-tagGroups` → "REST API",
  // read off developers.flodesk.com's embedded OpenAPI document on 2026-08-03.
  // If this app ever grows an action, it must map onto one of these.
  const documented = new Set([
    "GET /subscribers",
    "POST /subscribers",
    "POST /subscribers/batch",
    "GET /subscribers/{id_or_email}",
    "POST /subscribers/{id_or_email}/segments",
    "DELETE /subscribers/{id_or_email}/segments",
    "POST /subscribers/{id_or_email}/unsubscribe",
    "GET /segments",
    "POST /segments",
    "GET /segments/colors",
    "GET /segments/{id}",
    "GET /workflows",
    "POST /workflows/{workflow_id}/subscribers",
    "DELETE /workflows/{workflow_id}/subscribers/{id_or_email}",
    "GET /custom-fields",
    "POST /custom-fields",
    "GET /custom-fields/all",
    "GET /webhooks",
    "POST /webhooks",
    "GET /webhooks/{id}",
    "PUT /webhooks/{id}",
    "DELETE /webhooks/{id}",
  ]);
  assertEquals(documented.size, 22, "the documented set itself must be 22 operations");
  assertEquals(app.actions.length, documented.size, "one action per documented operation");
});

Deno.test("index: both documented auth methods are offered", () => {
  const byKey = Object.fromEntries(app.auth.map((a) => [a.key, a]));
  // HTTP Basic with the API key as username — Flodesk's private-integration path.
  assertEquals(byKey["api-key"].type, "basic");
  // Authorization-code OAuth2 — Flodesk's partner-integration path.
  assertEquals(byKey["oauth2"].type, "oauth2");
});
