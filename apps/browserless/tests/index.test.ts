import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const KEYS = JSON.parse(await Deno.readTextFile(new URL("./action-keys.json", import.meta.url)));
const PKG = JSON.parse(await Deno.readTextFile(new URL("../package.json", import.meta.url)));

Deno.test("index: one api-token auth method and three health checks", () => {
  assertEquals(app.auth?.length, 1);
  assertEquals(app.auth?.[0].key, "api-token");
  assertEquals(app.healthChecks?.map((h) => h.key), ["service", "api", "quota"]);
});

Deno.test("index: action keys are unique and match the expected surface", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  assertEquals(keys, KEYS);
  assertEquals(app.actions.length, 16);
});

Deno.test("index: every action has a title, a valid type and an execute hook", () => {
  for (const action of app.actions) {
    assertEquals(typeof action.title, "string");
    assertEquals(["read", "perform"].includes(action.type), true);
    assertEquals(typeof action.execute, "function");
    assertEquals(action.type === "perform", typeof action.idempotent === "boolean");
  }
});

Deno.test("index: no action source touches a credential, a token or global fetch", async () => {
  for (const key of app.actions.map((a) => a.key)) {
    const src = await Deno.readTextFile(new URL(`../actions/${key}.ts`, import.meta.url));
    assertEquals(/\btoken\b/i.test(src.replace(/\/\*[\s\S]*?\*\//g, "")), false, key);
    assertEquals(/(^|[^.\w])fetch\(/.test(src), false, key);
  }
});

Deno.test("index: network.allow lists exactly the hosts the app calls", () => {
  assertEquals(
    [...PKG.w6w.network.allow].sort(),
    [
      "api.browserless.io",
      "production-ams.browserless.io",
      "production-lon.browserless.io",
      "production-sfo.browserless.io",
      "status.browserless.io",
    ],
  );
});

Deno.test("index: the quota check is unavailable and informational", () => {
  const quota = app.healthChecks!.find((h) => h.key === "quota")!;
  assertEquals(quota.severity, "informational");
  assert(quota.unavailable?.reason);
});
