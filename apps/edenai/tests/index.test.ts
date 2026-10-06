import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: declares the api-key auth and the two health checks", () => {
  assertEquals(app.auth.map((a) => a.key), ["api-key"]);
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "quota"]);
});

Deno.test("index: 30 actions with unique kebab-case keys", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(keys.length, 30);
  assertEquals(new Set(keys).size, keys.length);
  for (const k of keys) assert(/^[a-z][a-z0-9-]*$/.test(k), k);
});

Deno.test("index: every perform action states its idempotency", () => {
  for (const a of app.actions) {
    if (a.type === "perform") assert(typeof a.idempotent === "boolean", a.key);
  }
});

Deno.test("index: no action sends credentials or touches global fetch", async () => {
  for (const a of app.actions) {
    const src = await Deno.readTextFile(new URL(`../actions/${a.key}.ts`, import.meta.url));
    assert(!/authorization/i.test(src), `${a.key} mentions authorization`);
    assert(!/(^|[^.\w])fetch\(/.test(src), `${a.key} calls global fetch`);
  }
});
