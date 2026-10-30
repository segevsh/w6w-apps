import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("quota: declared unavailable, informational severity", () => {
  assertEquals(typeof quota.check, "undefined");
  assertEquals((quota.unavailable?.reason?.length ?? 0) > 0, true);
  assertEquals(quota.severity, "informational");
});
