import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("quota: declared unavailable, no check hook, informational severity", () => {
  assertEquals(typeof quota.check, "undefined");
  assert(quota.unavailable?.reason && quota.unavailable.reason.length > 0);
  assertEquals(quota.severity, "informational");
});

test("quota: the reason explains WHY (no proactive header), not just that it's missing", () => {
  const reason = quota.unavailable!.reason;
  assert(/RateLimit-Reset/.test(reason));
  assert(/429/.test(reason));
});
