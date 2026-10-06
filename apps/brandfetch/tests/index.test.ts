import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const PKG = JSON.parse(await Deno.readTextFile(new URL("../package.json", import.meta.url)));

Deno.test("index: one api-key auth method and three health checks", () => {
  assertEquals(app.auth?.length, 1);
  assertEquals(app.auth?.[0].key, "api-key");
  assertEquals(app.healthChecks?.map((h) => h.key), ["service", "api", "quota"]);
});

Deno.test("index: nine unique actions with the expected keys", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  assertEquals(keys, [
    "get-brand",
    "get-brand-by-domain",
    "get-brand-by-ticker",
    "get-brand-by-isin",
    "get-brand-by-crypto",
    "search-brands",
    "get-brand-context",
    "get-brand-from-transaction",
    "get-viewer",
  ]);
});

Deno.test("index: every action has a title, a valid type and an execute hook", () => {
  for (const action of app.actions) {
    assertEquals(typeof action.title, "string");
    assertEquals(["read", "search", "perform"].includes(action.type), true);
    assertEquals(typeof action.execute, "function");
  }
});

Deno.test("index: no action source touches a credential or global fetch", async () => {
  for (const key of app.actions.map((a) => a.key)) {
    const src = await Deno.readTextFile(new URL(`../actions/${key}.ts`, import.meta.url));
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "");
    assertEquals(/authorization|bearer|apiKey/i.test(code), false, key);
    assertEquals(/(^|[^.\w])fetch\(/.test(code), false, key);
  }
});

Deno.test("index: network.allow lists exactly the hosts the app calls", () => {
  assertEquals([...PKG.w6w.network.allow].sort(), ["api.brandfetch.io"]);
});

Deno.test("index: every health check is live, so none is an unavailable entry", () => {
  for (const h of app.healthChecks!) assert(!h.unavailable, h.key);
});
