import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("quota: is a declared absence, informational severity", () => {
  assertEquals(typeof quota.check, "undefined");
  assert(quota.unavailable?.reason.length ?? 0 > 0);
  assertEquals(quota.severity, "informational");
});
