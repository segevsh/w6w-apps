import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("quota: declared unavailable, informational, no live probe", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  assert(quota.unavailable?.reason.length ?? 0 > 0);
  assertEquals("check" in quota, false);
});
