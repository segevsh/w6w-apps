import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: four actions with unique kebab-case keys", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(keys.length, 4);
  assertEquals(new Set(keys).size, 4);
  for (const k of keys) assert(/^[a-z][a-z0-9-]*$/.test(k), k);
});

Deno.test("index: oauth2 is the only auth method", () => {
  assertEquals(app.auth.map((a) => a.key), ["oauth2"]);
  assertEquals(app.auth[0].type, "oauth2");
});

Deno.test("index: every action is a read (the API is read-only)", () => {
  for (const a of app.actions) assertEquals(a.type, "read");
});

Deno.test("index: quota is a declared absence with informational severity", () => {
  const quota = app.healthChecks.find((h) => h.key === "quota")!;
  assert(quota.unavailable);
  assertEquals(quota.severity, "informational");
  assert(app.healthChecks.some((h) => h.key === "service" && h.credential === "none"));
});
