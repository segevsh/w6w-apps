import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("quota: is a declared absence, not a live probe", () => {
  assertEquals(typeof quota.check, "undefined");
  assert(quota.unavailable?.reason && quota.unavailable.reason.length > 0);
});

/**
 * `severity: "informational"` is load-bearing: an `unavailable` entry always
 * reports `unknown`, which outranks `ok` in the roll-up — at any other
 * severity this would pin the app's verdict at `unknown` forever.
 */
test("quota: is informational, not degraded or fatal", () => {
  assertEquals(quota.severity, "informational");
});

test("quota: declares kind quota", () => {
  assertEquals(quota.kind, "quota");
});
