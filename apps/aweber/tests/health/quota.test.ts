import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("quota: declared unavailable, not guessed, and informational so it never pins the roll-up", () => {
  assertEquals(typeof quota.check, "undefined");
  assertEquals(typeof quota.unavailable?.reason, "string");
  assert(quota.unavailable!.reason.length > 0);
  assertEquals(quota.severity, "informational");
});
