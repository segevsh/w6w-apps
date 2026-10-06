import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: unique kebab-case action keys, one apiKey auth, health checks wired", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const k of keys) assert(/^[a-z][a-z0-9-]*$/.test(k), k);
  assertEquals(app.auth?.map((a) => a.key), ["api-key"]);
  assertEquals(app.healthChecks?.map((h) => h.key), ["service", "api"]);
});

Deno.test("index: every perform action states idempotency; no deprecated /status/list", () => {
  for (const a of app.actions) {
    if (a.type === "perform") assertEquals(typeof a.idempotent, "boolean", a.key);
  }
});
