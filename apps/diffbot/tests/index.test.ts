import { denoReadTextFile, denoStat } from "./_deno.ts";
import { test } from "node:test";
import { assert, assertEquals } from "./_assert.ts";
import app from "../index.ts";

const PKG = JSON.parse(await denoReadTextFile(new URL("../package.json", import.meta.url)));

test("index: one api-token auth method and three health checks", () => {
  assertEquals(app.auth?.length, 1);
  assertEquals(app.auth?.[0].key, "api-token");
  assertEquals(app.healthChecks?.map((h) => h.key), ["service", "api", "quota"]);
});

test("index: twenty unique actions with the expected keys", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  assertEquals(keys.length, 20);
  for (
    const k of [
      "extract-analyze",
      "kg-search",
      "kg-enhance",
      "nl-process-text",
      "web-search",
      "crawl-create",
      "crawl-data-get",
      "account-get",
    ]
  ) {
    assert(keys.includes(k), k);
  }
});

test("index: every action has a title, a valid type and an execute hook", () => {
  for (const action of app.actions) {
    assertEquals(typeof action.title, "string");
    assertEquals(["read", "search", "perform"].includes(action.type), true, action.key);
    assertEquals(typeof action.execute, "function");
  }
});

test("index: no action source touches a credential or global fetch", async () => {
  for (const key of app.actions.map((a) => a.key)) {
    const src = await denoReadTextFile(new URL(`../actions/${key}.ts`, import.meta.url));
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "");
    assertEquals(/authorization|bearer|apiKey/i.test(code), false, key);
    assertEquals(/(^|[^.\w])fetch\(/.test(code), false, key);
  }
});

test("index: network.allow is exactly the four Diffbot hosts", () => {
  assertEquals(
    [...PKG.w6w.network.allow].sort(),
    ["api.diffbot.com", "kg.diffbot.com", "llm.diffbot.com", "nl.diffbot.com"],
  );
});

test("index: service and quota are unavailable at informational severity", () => {
  for (const key of ["service", "quota"]) {
    const h = app.healthChecks!.find((x) => x.key === key)!;
    assertEquals(h.severity, "informational");
    assert(h.unavailable);
  }
});

test("index: the icon is shipped", async () => {
  const st = await denoStat(new URL("../assets/icon.svg", import.meta.url));
  assert(st.size > 0);
});
