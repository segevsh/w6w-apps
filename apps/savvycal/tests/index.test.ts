import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";
import pkg from "../package.json" with { type: "json" };

Deno.test("entry: 21 actions with unique kebab-case keys", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(keys.length, 21);
  assertEquals(new Set(keys).size, keys.length);
  for (const k of keys) assert(/^[a-z][a-z0-9-]*$/.test(k), k);
});

Deno.test("entry: every perform action declares idempotent honestly", () => {
  for (const a of app.actions) {
    if (a.type === "perform") assertEquals(typeof a.idempotent, "boolean", a.key);
  }
});

Deno.test("entry: two auth methods, each with a test hook", () => {
  assertEquals(app.auth.map((a) => a.key), ["personal-access-token", "oauth2"]);
  for (const a of app.auth) assertEquals(typeof a.test, "function");
});

Deno.test("entry: health checks declare service and an informational quota absence", () => {
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "quota"]);
});

Deno.test("manifest: egress is the API host only", () => {
  assertEquals(pkg.w6w.network.allow, ["api.savvycal.com"]);
  assertEquals(pkg.w6w.id, "io.w6w.savvycal");
});
