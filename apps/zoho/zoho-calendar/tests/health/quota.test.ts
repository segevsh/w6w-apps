import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("quota: declared unavailable, no check hook", () => {
  assertEquals(typeof quota.check, "undefined");
  assertEquals(typeof quota.unavailable?.reason, "string");
  assert(quota.unavailable!.reason.length > 0);
});

test("quota: informational, so the declared absence cannot pin the App at unknown forever", () => {
  assertEquals(quota.severity, "informational");
});
