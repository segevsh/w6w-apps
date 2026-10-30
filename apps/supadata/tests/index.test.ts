import { denoReadTextFile, denoStat } from "./_deno.ts";
import { test } from "node:test";
import { assert, assertEquals } from "./_assert.ts";
import app from "../index.ts";

const PKG = JSON.parse(await denoReadTextFile(new URL("../package.json", import.meta.url)));

const KEYS = [
  "transcript-get",
  "transcript-job-get",
  "metadata-get",
  "extract-start",
  "extract-job-get",
  "web-scrape",
  "web-map",
  "web-crawl-start",
  "web-crawl-get",
  "youtube-search",
  "youtube-channel-get",
  "youtube-channel-videos",
  "youtube-playlist-get",
  "youtube-playlist-videos",
  "youtube-transcript-translate",
  "youtube-transcript-batch-start",
  "youtube-video-batch-start",
  "youtube-batch-get",
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
    assertEquals(/x-api-key|apiKey|authorization/i.test(code), false, key);
    assertEquals(/(^|[^.\w])fetch\(/.test(code), false, key);
  }
});

test("index: network.allow lists exactly the hosts the app calls", () => {
  assertEquals([...PKG.w6w.network.allow].sort(), ["api.supadata.ai"]);
});

test("index: the status check declares its own host, the others do not widen egress", () => {
  const byKey = Object.fromEntries(app.healthChecks!.map((h) => [h.key, h]));
  assertEquals(byKey.service.network?.allow, ["status.supadata.ai"]);
  assertEquals(byKey.api.network, undefined);
  assertEquals(byKey.quota.network, undefined);
  assertEquals(byKey.quota.severity, "informational");
  assert(typeof byKey.quota.check === "function");
});
