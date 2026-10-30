import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("quota: declared unavailable, informational, and undeclared as a live check", () => {
  assertEquals(quota.check, undefined);
  assertEquals(quota.severity, "informational");
  assert(!!quota.unavailable?.reason);
  assert(quota.unavailable!.reason.includes("X-Rate-Limit"));
});
