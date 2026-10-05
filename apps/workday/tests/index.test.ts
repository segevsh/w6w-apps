import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: 25 actions with unique kebab-case keys, each with a test file", async () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(keys.length, 25);
  assertEquals(new Set(keys).size, 25);
  for (const k of keys) {
    assert(/^[a-z][a-z0-9-]*$/.test(k), k);
    await Deno.stat(new URL(`./actions/${k}.test.ts`, import.meta.url));
  }
});

Deno.test("index: every perform action states idempotency, every read does not", () => {
  for (const a of app.actions) {
    if (a.type === "perform") assertEquals(typeof a.idempotent, "boolean", a.key);
    else assertEquals(a.idempotent, undefined, a.key);
  }
  assertEquals(app.actions.filter((a) => a.type === "perform").map((a) => a.key), [
    "time-off-request",
  ]);
});

Deno.test("index: one custom auth method and a declared service absence", () => {
  assertEquals(app.auth?.map((a) => a.key), ["refresh-token"]);
  assertEquals(app.auth?.[0].type, "custom");
  const service = app.healthChecks?.find((h) => h.key === "service");
  assertEquals(service?.severity, "informational");
  assert(service?.unavailable?.reason);
  assertEquals(service?.check, undefined);
});

Deno.test("index: manifest allows exactly the two Workday wildcard suffixes", async () => {
  const pkg = JSON.parse(await Deno.readTextFile(new URL("../package.json", import.meta.url)));
  assertEquals(pkg.w6w.network.allow, ["*.workday.com", "*.myworkday.com"]);
});

Deno.test("index: no action carries a credential or calls global fetch", async () => {
  for (const a of app.actions) {
    const src = await Deno.readTextFile(new URL(`../actions/${a.key}.ts`, import.meta.url));
    assert(!/authorization/i.test(src), `${a.key} mentions authorization`);
    assert(!/[^.\w]fetch\(/.test(src), `${a.key} calls global fetch`);
  }
  const lib = await Deno.readTextFile(new URL("../lib/client.ts", import.meta.url));
  assert(
    !/authorization/i.test(lib.replace(/\/\*[\s\S]*?\*\//g, "")),
    "client mentions authorization",
  );
});
