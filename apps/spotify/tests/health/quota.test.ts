import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("quota: declared unavailable rather than a fabricated probe", () => {
  assertEquals(quota.check, undefined);
  assertEquals(quota.unavailable?.reason !== undefined, true);
  assertEquals(quota.severity, "informational");
});
