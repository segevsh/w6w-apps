import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: a declared absence with an informational severity", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  assertEquals(typeof quota.unavailable?.reason, "string");
});
