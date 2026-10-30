import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("health/quota: declared unavailable and informational", () => {
  assertEquals(typeof quota.check, "undefined");
  assertEquals(quota.severity, "informational");
  assertEquals(typeof quota.unavailable?.reason, "string");
  assertEquals(quota.unavailable!.reason.length > 0, true);
});
