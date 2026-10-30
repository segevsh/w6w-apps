import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("quota: is a declared absence, not a probe", () => {
  assertEquals(typeof quota.check, "undefined");
  assertEquals(typeof quota.unavailable?.reason, "string");
  assertEquals(quota.unavailable!.reason.length > 0, true);
});

/**
 * `unavailable` always reports `unknown`, which outranks `ok` in the
 * roll-up — at any severity but `informational` this would pin the app's
 * overall verdict at `unknown` forever.
 */
test("quota: is informational, or it would pin the app's verdict at unknown forever", () => {
  assertEquals(quota.severity, "informational");
});

test("quota: is kind quota, scoped to the connection", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.scope, "connection");
});
