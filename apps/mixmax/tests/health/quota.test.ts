import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("quota: declared unavailable with informational severity, no hook", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  assert(quota.unavailable?.reason.includes("120 requests"));
  assertEquals(quota.check, undefined);
});
