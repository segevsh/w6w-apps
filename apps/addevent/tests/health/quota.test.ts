import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("quota: a declared absence, not a probe — and informational so it never pins the App down", () => {
  assertEquals(typeof quota.check, "undefined");
  assertEquals(typeof quota.unavailable?.reason, "string");
  assertEquals(quota.severity, "informational");
});
