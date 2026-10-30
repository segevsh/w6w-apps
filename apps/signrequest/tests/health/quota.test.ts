import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("quota: declared unavailable with informational severity", () => {
  assertEquals(quota.unavailable !== undefined, true);
  assertEquals(quota.severity, "informational");
  assertEquals(quota.check, undefined);
});
