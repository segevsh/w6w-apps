import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("health/quota: declared unavailable, informational", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  assertEquals(typeof quota.unavailable?.reason, "string");
});
