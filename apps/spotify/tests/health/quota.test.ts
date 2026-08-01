import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: declared unavailable rather than a fabricated probe", () => {
  assertEquals(quota.check, undefined);
  assertEquals(quota.unavailable?.reason !== undefined, true);
  assertEquals(quota.severity, "informational");
});
