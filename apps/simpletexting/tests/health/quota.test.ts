import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("quota: is a declared absence, not a broken probe", () => {
  assertEquals(quota.check, undefined);
  assertEquals(typeof quota.unavailable?.reason, "string");
  assert(quota.unavailable!.reason.length > 100, "the reason must state the evidence");
  assertEquals(quota.kind, "quota");
});

/**
 * `informational` is load-bearing: an `unavailable` check always reports
 * `unknown`, and `unknown` outranks `ok` in the roll-up — at any other severity
 * this entry would pin the app's verdict at `unknown` forever.
 */
test("quota: an unavailable entry is informational, or it poisons the roll-up", () => {
  assertEquals(quota.severity, "informational");
});

test("quota: the reason names what the vendor does and does not publish", () => {
  const reason = quota.unavailable!.reason;
  assert(reason.includes("credits"), reason);
  assert(reason.includes("rate limit"), reason);
  assert(/2026-09-22/.test(reason), reason);
});
