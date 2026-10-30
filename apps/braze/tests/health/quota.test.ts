import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("quota: declared unavailable at informational severity, so it never pins the app at unknown", () => {
  assertEquals(quota.check, undefined);
  assert(quota.unavailable?.reason.length! > 0);
  assertEquals(quota.severity, "informational");
});
