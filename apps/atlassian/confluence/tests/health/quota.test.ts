import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("quota: is a declared absence, because Atlassian publishes no headroom", () => {
  assertEquals(quota.kind, "quota");
  assert(quota.unavailable?.reason);
  assertEquals(quota.check, undefined);
});

test("quota: the absence is informational, or it would pin the verdict at unknown", () => {
  // An `unavailable` entry always reports `unknown`, and `unknown` outranks
  // `ok` in the roll-up.
  assertEquals(quota.severity, "informational");
});
