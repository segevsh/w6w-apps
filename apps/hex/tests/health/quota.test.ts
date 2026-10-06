import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: a declared absence with informational severity and no hook", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  assertEquals(typeof quota.unavailable?.reason, "string");
  assertEquals("check" in quota, false);
});
