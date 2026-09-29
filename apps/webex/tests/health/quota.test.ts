import { assertEquals, assertExists } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: declared unavailable, informational, no hook", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  assertEquals(quota.covers, ["*"]);
  assertExists(quota.unavailable?.reason);
  assertEquals(quota.check, undefined);
});
