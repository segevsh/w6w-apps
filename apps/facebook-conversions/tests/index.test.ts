import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: declares two auth methods and the expected action/health-check counts", () => {
  assertEquals(app.auth?.map((a) => a.key), ["conversions-token", "oauth2"]);
  assertEquals(app.actions.length, 5);
  assertEquals(app.healthChecks?.length, 2);
});

Deno.test("index: every action key is unique", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
});

Deno.test("index: every action has a title, type, description, output and execute hook", () => {
  for (const action of app.actions) {
    assertEquals(typeof action.title, "string");
    assertEquals(typeof action.type, "string");
    assertEquals(typeof action.description, "string");
    assertEquals(typeof action.execute, "function");
    assert(Array.isArray(action.output), `${action.key} declares no output fields`);
  }
});

Deno.test("index: every perform action declares idempotent honestly", () => {
  for (const action of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof action.idempotent, "boolean", `${action.key} does not declare idempotent`);
  }
});

Deno.test("index: covers the whole Conversions API surface and nothing more", () => {
  assertEquals(app.actions.map((a) => a.key), [
    "send-event",
    "send-events",
    "get-dataset",
    "get-dataset-quality",
    "list-diagnostics",
  ]);
});

Deno.test("index: does not duplicate the sibling Meta apps' surfaces", () => {
  const keys = app.actions.map((a) => a.key);
  // facebook (Pages) …
  for (const k of ["create-post", "list-posts", "get-page", "get-page-insights"]) {
    assertEquals(keys.includes(k), false);
  }
  // … and facebook-lead-ads.
  for (const k of ["list-forms", "list-recent-leads"]) {
    assertEquals(keys.includes(k), false);
  }
});

Deno.test("index: health checks are keyed service and quota", () => {
  assertEquals(app.healthChecks?.map((h) => h.key), ["service", "quota"]);
});

Deno.test("index: every write action offers the hashing control", () => {
  for (const action of app.actions.filter((a) => a.type === "perform")) {
    const hashing = action.params?.find((p) => p.key === "hashing");
    assert(hashing, `${action.key} has no hashing param`);
    assertEquals(hashing!.default, "auto");
  }
});
