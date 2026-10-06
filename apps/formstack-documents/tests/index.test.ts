import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exposes 26 uniquely-keyed actions", () => {
  assertEquals(app.actions.length, 26);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "action keys must be unique");
});

Deno.test("index: every action has a resource and a valid type", () => {
  for (const a of app.actions) {
    assertEquals(typeof a.resource, "string");
    assert(["read", "search", "perform", "control"].includes(a.type));
  }
});

Deno.test("index: every perform action states idempotency", () => {
  for (const a of app.actions.filter((x) => x.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", a.key);
  }
});

Deno.test("index: declares one basic auth method", () => {
  assertEquals(app.auth?.map((a) => a.key), ["api-key"]);
});

Deno.test("index: declares service and quota health checks, quota informational", () => {
  assertEquals(app.healthChecks?.map((h) => h.key), ["service", "quota"]);
  assertEquals(app.healthChecks?.find((h) => h.key === "quota")?.severity, "informational");
});
