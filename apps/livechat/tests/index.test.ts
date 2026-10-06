import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: 22 actions with unique kebab-case keys, each with a source file", async () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(keys.length, 22);
  assertEquals(new Set(keys).size, 22);
  for (const k of keys) {
    assert(/^[a-z][a-z0-9-]*$/.test(k), k);
    await Deno.stat(new URL(`../actions/${k}.ts`, import.meta.url));
    await Deno.stat(new URL(`./actions/${k}.test.ts`, import.meta.url));
  }
});

Deno.test("index: every perform action states idempotency, every read does not", () => {
  for (const a of app.actions) {
    if (a.type === "perform") assertEquals(typeof a.idempotent, "boolean", a.key);
    else assertEquals(a.idempotent, undefined, a.key);
  }
});

Deno.test("index: one basic auth method and three health checks", () => {
  assertEquals(app.auth?.map((a) => [a.key, a.type]), [["personal-access-token", "basic"]]);
  assertEquals(app.healthChecks?.map((h) => h.key), ["service", "api", "quota"]);
});

Deno.test("index: no action carries a credential or calls global fetch", async () => {
  for (const a of app.actions) {
    const src = await Deno.readTextFile(new URL(`../actions/${a.key}.ts`, import.meta.url));
    assert(!/authorization/i.test(src.replace(/`[^`]*`/g, "")), `${a.key} mentions authorization`);
    assert(!/[^.\w]fetch\(/.test(src), `${a.key} calls global fetch`);
  }
});

Deno.test("index: manifest allowlists exactly the one host the actions call (the status host is the check's own)", async () => {
  const pkg = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as { w6w: { network: { allow: string[] } } };
  assertEquals(pkg.w6w.network.allow, ["api.livechatinc.com"]);
});
