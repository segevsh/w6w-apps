import { assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports one auth method and every action has a unique key", () => {
  assertEquals(app.auth?.length, 1);
  assertEquals(app.auth?.[0].key, "api-key");

  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  assertEquals(app.actions.length > 0, true);
});

Deno.test("index: every action has a title, type and no bare `execute` missing", () => {
  for (const action of app.actions) {
    assertEquals(typeof action.title, "string");
    assertEquals(["read", "search", "perform", "control"].includes(action.type), true);
    assertEquals(typeof action.execute, "function");
  }
});

Deno.test("index: declares two health checks — service and quota, both live probes", () => {
  const keys = app.healthChecks?.map((h) => h.key) ?? [];
  assertEquals(keys.includes("service"), true);
  assertEquals(keys.includes("quota"), true);
  for (const h of app.healthChecks ?? []) {
    assertEquals(h.unavailable === undefined, true);
    assertEquals(typeof h.check, "function");
  }
});

Deno.test("index: no direct file-upload action — see index.ts module doc for why", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(keys.includes("document-upload"), false);
});

Deno.test("index: no oauth2 auth method — API Key only, see index.ts module doc for why", () => {
  const keys = app.auth?.map((a) => a.key) ?? [];
  assertEquals(keys.includes("oauth2"), false);
});
