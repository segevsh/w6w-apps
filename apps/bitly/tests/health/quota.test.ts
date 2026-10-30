import { test } from "node:test";
import { assertEquals, assertExists } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("quota: declared unavailable, no check hook", () => {
  assertEquals(quota.check, undefined);
  assertExists(quota.unavailable);
  assertEquals(quota.severity, "informational");
});
