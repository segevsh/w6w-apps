import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: declares 32 actions, 9 auth methods and 2 health checks", () => {
  assertEquals(app.actions.length, 32);
  assertEquals(app.auth.length, 9);
  assertEquals(app.healthChecks.length, 2);
});

Deno.test("index: action keys are unique kebab-case and perform actions declare idempotent", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const a of app.actions) {
    assert(/^[a-z]+(-[a-z]+)*$/.test(a.key), a.key);
    if (a.type === "perform") assert(typeof a.idempotent === "boolean", a.key);
  }
});
