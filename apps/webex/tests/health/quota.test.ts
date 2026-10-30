import { test } from "node:test";
import { assertEquals, assertExists } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("quota: declared unavailable, informational, no hook", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  assertEquals(quota.covers, ["*"]);
  assertExists(quota.unavailable?.reason);
  assertEquals(quota.check, undefined);
});
