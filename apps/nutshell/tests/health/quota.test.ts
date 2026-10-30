import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("quota: is a declared absence, not a live probe", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.check, undefined);
  assertEquals(typeof quota.unavailable?.reason, "string");
  assertEquals(quota.unavailable!.reason.length > 0, true);
});

test("quota: severity is informational, so it never pins the app's verdict at unknown", () => {
  assertEquals(quota.severity, "informational");
});
