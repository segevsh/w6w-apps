import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("quota: declared unavailable with a reason, informational severity, no check hook", () => {
  assertEquals(quota.severity, "informational");
  assert(quota.unavailable?.reason.length);
  assertEquals(quota.check, undefined);
});
