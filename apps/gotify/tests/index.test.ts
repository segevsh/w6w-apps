import { assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: declares one auth method and every action key is unique", () => {
  assertEquals(app.auth?.length, 1);
  assertEquals(app.auth?.[0].key, "client-token");

  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action keys");
  assertEquals(keys.length, 12);
});

Deno.test("index: declares the instance + service health checks", () => {
  const keys = app.healthChecks?.map((h) => h.key) ?? [];
  assertEquals(keys.sort(), ["instance", "service"]);
});

Deno.test("index: the destructive application/client deletes are not present", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(keys.includes("application-delete"), false);
  assertEquals(keys.includes("client-delete"), false);
});
