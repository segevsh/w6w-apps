import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("quota: declared unavailable and informational — Data Center publishes no rate-limit headers", () => {
  assertEquals(quota.check, undefined);
  assert((quota.unavailable?.reason.length ?? 0) > 0);
  assertEquals(quota.severity, "informational");
});
