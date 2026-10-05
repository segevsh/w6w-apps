import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: 28 actions with unique kebab-case keys", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(keys.length, 28);
  assertEquals(new Set(keys).size, 28);
  for (const k of keys) assert(/^[a-z][a-z0-9-]*$/.test(k), k);
});

Deno.test("index: every perform action states idempotency, every read does not", () => {
  for (const a of app.actions) {
    if (a.type === "perform") assertEquals(typeof a.idempotent, "boolean", a.key);
    else assertEquals(a.idempotent, undefined, a.key);
  }
});

Deno.test("index: one custom auth method and a declared service absence", () => {
  assertEquals(app.auth?.map((a) => a.key), ["client-credentials"]);
  const service = app.healthChecks?.find((h) => h.key === "service");
  assertEquals(service?.severity, "informational");
  assert(service?.unavailable?.reason);
  assertEquals(service?.check, undefined);
});

Deno.test("index: no action carries a credential or calls global fetch", async () => {
  for (const a of app.actions) {
    const src = await Deno.readTextFile(new URL(`../actions/${a.key}.ts`, import.meta.url));
    assert(!/authorization/i.test(src), `${a.key} mentions authorization`);
    assert(!/[^.\w]fetch\(/.test(src), `${a.key} calls global fetch`);
  }
});
