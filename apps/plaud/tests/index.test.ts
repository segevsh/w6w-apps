import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: 7 actions with unique kebab-case keys", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(keys.length, 7);
  assertEquals(new Set(keys).size, 7);
  for (const k of keys) assert(/^[a-z][a-z0-9-]*$/.test(k), k);
});

Deno.test("index: every perform action states idempotency, every read does not", () => {
  for (const a of app.actions) {
    if (a.type === "perform") assertEquals(typeof a.idempotent, "boolean", a.key);
    else assertEquals(a.idempotent, undefined, a.key);
  }
});

Deno.test("index: one custom auth method; service is live, quota is a declared absence", () => {
  assertEquals(app.auth?.map((a) => a.key), ["credentials"]);
  const service = app.healthChecks?.find((h) => h.key === "service");
  assertEquals(typeof service?.check, "function");
  const quota = app.healthChecks?.find((h) => h.key === "quota");
  assertEquals(quota?.severity, "informational");
  assert(quota?.unavailable?.reason);
  assertEquals(quota?.check, undefined);
});

Deno.test("index: no action carries a credential or calls global fetch", async () => {
  for (const a of app.actions) {
    const src = await Deno.readTextFile(new URL(`../actions/${a.key}.ts`, import.meta.url));
    assert(!/authorization|x-client-api-key/i.test(src), `${a.key} mentions a credential header`);
    assert(!/[^.\w]fetch\(/.test(src), `${a.key} calls global fetch`);
  }
});

Deno.test("index: manifest allows exactly the two Plaud hosts the app calls", async () => {
  const pkg = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  );
  assertEquals(pkg.w6w.network.allow, ["platform-us.plaud.ai", "platform-jp.plaud.ai"]);
});
