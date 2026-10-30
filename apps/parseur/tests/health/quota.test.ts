import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("quota: is a declared absence, not a live probe", () => {
  assertEquals(typeof quota.check, "undefined");
  assertEquals(typeof quota.unavailable?.reason, "string");
  assert(quota.unavailable!.reason.length > 0);
});

test("quota: is informational so it never pins the app's verdict at unknown", () => {
  assertEquals(quota.severity, "informational");
});
