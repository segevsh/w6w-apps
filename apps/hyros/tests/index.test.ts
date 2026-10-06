import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: 19 uniquely-keyed actions, one apiKey auth, a service health check", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(keys.length, 19);
  assertEquals(new Set(keys).size, 19);
  for (const k of keys) assert(/^[a-z]+(-[a-z]+)*$/.test(k), k);
  assertEquals(app.auth.map((a) => a.key), ["api-key"]);
  assertEquals(app.healthChecks[0].severity, "informational");
});

Deno.test("index: every perform action declares idempotency", () => {
  for (const a of app.actions) {
    if (a.type === "perform") assert(typeof a.idempotent === "boolean", a.key);
  }
});
