import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("quota: declared unavailable, informational, with no check hook", () => {
  assertEquals(quota.severity, "informational");
  assert(quota.unavailable?.reason.includes("consumes characters"));
  assertEquals(quota.check, undefined);
});
