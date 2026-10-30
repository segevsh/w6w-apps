import { denoReadFile, denoReadTextFile } from "./_deno.ts";
import { test } from "node:test";
import { assert, assertEquals } from "./_assert.ts";
import app from "../index.ts";

const PKG = JSON.parse(await denoReadTextFile(new URL("../package.json", import.meta.url)));

test("index: one api-key auth method and three health checks", () => {
  assertEquals(app.auth?.length, 1);
  assertEquals(app.auth?.[0].key, "api-key");
  assertEquals(app.healthChecks?.map((h) => h.key), ["service", "api", "quota"]);
});

test("index: fifteen unique actions with the expected keys", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  assertEquals(keys, [
    "get-account",
    "search-people",
    "lookup-person",
    "check-lookup-status",
    "bulk-lookup-people",
    "search-companies",
    "lookup-company",
    "verify-email",
    "get-universal-account",
    "universal-search-people",
    "universal-lookup-person",
    "universal-check-lookup-status",
    "universal-bulk-lookup-people",
    "universal-search-companies",
    "universal-lookup-company",
  ]);
});

test("index: every action has a title, a valid type and an execute hook", () => {
  for (const action of app.actions) {
    assertEquals(typeof action.title, "string");
    assertEquals(["read", "search", "perform"].includes(action.type), true);
    assertEquals(typeof action.execute, "function");
    if (action.type === "perform") assertEquals(action.idempotent, false, action.key);
  }
});

test("index: no action source touches a credential or global fetch", async () => {
  for (const key of app.actions.map((a) => a.key)) {
    const src = await denoReadTextFile(new URL(`../actions/${key}.ts`, import.meta.url));
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "");
    assertEquals(/authorization|bearer|api-key|apiKey/i.test(code), false, key);
    assertEquals(/(^|[^.\w])fetch\(/.test(code), false, key);
  }
});

test("index: network.allow lists exactly the hosts the actions call", () => {
  assertEquals([...PKG.w6w.network.allow].sort(), ["api.rocketreach.co"]);
});

test("index: every health check is live, so none is an unavailable entry", () => {
  for (const h of app.healthChecks!) assert(!h.unavailable, h.key);
});

test("index: the icon exists and is the vendor PNG", async () => {
  const bytes = await denoReadFile(new URL("../assets/icon.png", import.meta.url));
  assertEquals([...bytes.slice(0, 4)], [0x89, 0x50, 0x4e, 0x47]);
  assertEquals(PKG.w6w.appearance.icon.url, "./assets/icon.png");
});
