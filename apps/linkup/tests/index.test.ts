import { denoReadTextFile } from "./_deno.ts";
import { test } from "node:test";
import { assert, assertEquals } from "./_assert.ts";
import app from "../index.ts";

const PKG = JSON.parse(await denoReadTextFile(new URL("../package.json", import.meta.url)));

const KEYS = [
  "search",
  "search-results",
  "search-answer",
  "search-structured",
  "fetch",
  "credits-balance",
  "extract-create",
  "extract-list",
  "extract-get",
  "tasks-create",
  "tasks-list",
  "tasks-get",
  "research-create",
  "research-list",
  "research-get",
  "rewind-search",
  "rewind-fetch",
  "create-response",
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

test("index: no action source touches a credential or global fetch", async () => {
  const files = [...KEYS.filter((k) => !k.startsWith("search-") && k !== "search"), "search"];
  for (const key of files) {
    const src = (await denoReadTextFile(new URL(`../actions/${key}.ts`, import.meta.url)))
      .replace(/\/\*[\s\S]*?\*\//g, "");
    assertEquals(/authorization|bearer|apiKey/i.test(src), false, key);
    assertEquals(/(^|[^.\w])fetch\(/.test(src), false, key);
  }
});

test("index: network.allow lists exactly the hosts the app calls", () => {
  assertEquals([...PKG.w6w.network.allow].sort(), ["api.linkup.so"]);
});

test("index: the quota check is a live informational probe", () => {
  const quota = app.healthChecks!.find((h) => h.key === "quota")!;
  assertEquals(quota.severity, "informational");
  assertEquals(typeof quota.check, "function");
  assert(!quota.unavailable);
});
