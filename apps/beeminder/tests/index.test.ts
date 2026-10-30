import { denoReadDirSync, denoReadTextFile, denoStat } from "./_deno.ts";
import { test } from "node:test";
import { assert, assertEquals } from "./_assert.ts";
import app from "../index.ts";

const PKG = JSON.parse(await denoReadTextFile(new URL("../package.json", import.meta.url)));

test("index: one auth-token method and two health checks", () => {
  assertEquals(app.auth?.length, 1);
  assertEquals(app.auth?.[0].key, "auth-token");
  assertEquals(app.healthChecks?.map((h) => h.key), ["service", "api"]);
});

test("index: 18 unique kebab-case actions with a valid type and an execute hook", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(keys.length, 18);
  assertEquals(new Set(keys).size, keys.length);
  for (const action of app.actions) {
    assert(/^[a-z][a-z0-9-]*$/.test(action.key), action.key);
    assertEquals(["read", "search", "perform"].includes(action.type), true);
    assertEquals(typeof action.execute, "function");
    assertEquals(typeof action.title, "string");
    if (action.type === "perform") assertEquals(typeof action.idempotent, "boolean", action.key);
  }
});

test("index: every action key has a source file and a test file", async () => {
  for (const key of app.actions.map((a) => a.key)) {
    await denoStat(new URL(`../actions/${key}.ts`, import.meta.url));
    await denoStat(new URL(`./actions/${key}.test.ts`, import.meta.url));
  }
});

test("index: no action or lib source touches a credential or global fetch", async () => {
  const files = [...denoReadDirSync(new URL("../actions", import.meta.url))].map((e) =>
    `../actions/${e.name}`
  );
  files.push("../lib/client.ts", "../lib/factories.ts");
  for (const f of files) {
    const src = await denoReadTextFile(new URL(f, import.meta.url));
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    assertEquals(/authorization|bearer|auth_token|authToken/i.test(code), false, f);
    assertEquals(/(^|[^.\w])fetch\(/.test(code), false, f);
  }
});

test("index: network.allow lists exactly the one host the app calls", () => {
  assertEquals([...PKG.w6w.network.allow], ["www.beeminder.com"]);
});

test("index: service is a declared absence at informational severity, api is live", () => {
  const [service, api] = app.healthChecks!;
  assert(service.unavailable);
  assertEquals(service.severity, "informational");
  assert(!api.unavailable);
});
