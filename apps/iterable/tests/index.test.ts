import { assertEquals } from "@std/assert";
import app from "../index.ts";

const KEYS = JSON.parse(await Deno.readTextFile(new URL("./action-keys.json", import.meta.url)));

Deno.test("index: declares one api-key auth method and the two health checks", () => {
  assertEquals(app.auth?.length, 1);
  assertEquals(app.auth?.[0].key, "api-key");
  assertEquals(app.healthChecks?.map((h) => h.key), ["service", "quota"]);
});

Deno.test("index: action keys are unique and match the expected surface", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  assertEquals(keys, KEYS);
  assertEquals(app.actions.length, 54);
});

Deno.test("index: every action has a title, a valid type and an execute hook", () => {
  for (const action of app.actions) {
    assertEquals(typeof action.title, "string");
    assertEquals(["read", "perform"].includes(action.type), true);
    assertEquals(typeof action.execute, "function");
    // Only perform actions declare idempotency.
    assertEquals(action.type === "perform", typeof action.idempotent === "boolean");
  }
});

Deno.test("index: no action carries credentials or an auth header", async () => {
  for (const key of app.actions.map((a) => a.key)) {
    const src = await Deno.readTextFile(new URL(`../actions/${key}.ts`, import.meta.url));
    assertEquals(/api-key|authorization/i.test(src), false, key);
  }
});
