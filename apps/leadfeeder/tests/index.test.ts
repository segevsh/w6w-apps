import { assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: 24 uniquely-keyed actions, one auth, three health checks", () => {
  const keys = app.actions!.map((a) => a.key);
  assertEquals(keys.length, 24);
  assertEquals(new Set(keys).size, 24);
  assertEquals(app.auth!.map((a) => a.key), ["api-key"]);
  assertEquals(app.healthChecks!.map((h) => h.key), ["service", "api", "quota"]);
});
