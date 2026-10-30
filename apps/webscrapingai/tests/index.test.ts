import { denoReadTextFile, denoStat } from "./_deno.ts";
import { test } from "node:test";
import { assert, assertEquals } from "./_assert.ts";
import app from "../index.ts";

const PKG = JSON.parse(await denoReadTextFile(new URL("../package.json", import.meta.url)));

const KEYS = [
  "ai-question",
  "ai-fields",
  "html-get",
  "text-get",
  "selected-get",
  "selected-multiple-get",
  "serp-search",
  "data-get",
  "account-get",
];

test("index: one api-key auth method and three health checks", () => {
  assertEquals(app.auth?.length, 1);
  assertEquals(app.auth?.[0].key, "api-key");
  assertEquals(app.healthChecks?.map((h) => h.key), ["service", "api", "quota"]);
});

test("index: action keys are unique and match the expected surface", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  assertEquals(keys, KEYS);
});

test("index: every action has a title, a valid type and an execute hook", () => {
  for (const action of app.actions) {
    assertEquals(typeof action.title, "string");
    assertEquals(["read", "search", "perform"].includes(action.type), true);
    assertEquals(typeof action.execute, "function");
    assertEquals(action.type === "perform", typeof action.idempotent === "boolean");
  }
});

test("index: every action key has a test file", async () => {
  for (const key of KEYS) {
    await denoStat(new URL(`./actions/${key}.test.ts`, import.meta.url));
  }
});

test("index: no action source touches a credential, a key or global fetch", async () => {
  for (const key of KEYS) {
    const src = await denoReadTextFile(new URL(`../actions/${key}.ts`, import.meta.url));
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "");
    assertEquals(/api_key|apiKey|authorization/i.test(code), false, key);
    assertEquals(/(^|[^.\w])fetch\(/.test(code), false, key);
  }
});

test("index: network.allow lists exactly the hosts the app calls", () => {
  assertEquals([...PKG.w6w.network.allow].sort(), ["api.webscraping.ai"]);
});

test("index: no health check widens egress; service is informational and hookless", () => {
  const byKey = Object.fromEntries(app.healthChecks!.map((h) => [h.key, h]));
  for (const h of app.healthChecks!) assertEquals(h.network, undefined);
  assertEquals(byKey.service.severity, "informational");
  assertEquals(byKey.service.check, undefined);
  assert(byKey.service.unavailable?.reason);
  assertEquals(byKey.quota.severity, "informational");
  assert(typeof byKey.quota.check === "function");
});
