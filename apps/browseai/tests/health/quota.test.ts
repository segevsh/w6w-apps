import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("quota: declares an absence rather than a check, at informational severity", () => {
  assertEquals(typeof quota.check, "undefined");
  assertEquals(quota.severity, "informational");
  assert(quota.unavailable?.reason.length && quota.unavailable.reason.length > 0);
});
