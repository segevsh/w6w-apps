import { assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: declares the expected action keys, once each", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(keys, [
    "rows-list",
    "row-get",
    "rows-count",
    "rows-insert",
    "rows-update",
    "rows-delete",
    "rpc-call",
  ]);
  assertEquals(new Set(keys).size, keys.length);
});

Deno.test("index: declares exactly the api-key auth method", () => {
  assertEquals(app.auth?.map((a) => a.key), ["api-key"]);
});

Deno.test("index: declares both health checks, once each", () => {
  const keys = app.healthChecks?.map((h) => h.key);
  assertEquals(keys, ["service", "reachable"]);
  assertEquals(new Set(keys).size, keys?.length);
});

Deno.test("index: every action requiring a table or function param declares one", () => {
  for (const action of app.actions) {
    const paramKeys = action.params?.map((p) => p.key) ?? [];
    const hasTargetParam = paramKeys.includes("table") || paramKeys.includes("function");
    assertEquals(hasTargetParam, true, `${action.key} is missing a table/function param`);
  }
});
