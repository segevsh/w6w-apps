import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: a declared absence, informational, no hook", () => {
  assertEquals(quota.severity, "informational");
  assertEquals(typeof quota.unavailable?.reason, "string");
  assertEquals(quota.check, undefined);
});
