import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("quota: declared unavailable rather than probed", () => {
  assertEquals(typeof quota.check, "undefined");
  assert(quota.unavailable?.reason && quota.unavailable.reason.length > 0);
});

test("quota: is informational — an unavailable quota check must not pin the app at unknown", () => {
  assertEquals(quota.severity, "informational");
});
