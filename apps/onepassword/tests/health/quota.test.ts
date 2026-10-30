import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("quota: is declared unavailable rather than left out", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(typeof quota.check, "undefined");
  assert(quota.unavailable?.reason, "no reason recorded");
});

test("quota: carries informational severity", () => {
  assertEquals(quota.severity, "informational");
});

test("quota: the reason is dated and names what was checked", () => {
  const reason = quota.unavailable!.reason!;
  assert(/2026-08-18/.test(reason), "the claim is undated");
  assert(/events\.1password\.com/.test(reason), reason);
  assert(/X-RateLimit/.test(reason), reason);
});

/** Limits exist on one surface and simply do not on the other. */
test("quota: it distinguishes the two surfaces", () => {
  const reason = quota.unavailable!.reason!;
  assert(/rate limited and answers 429/.test(reason), reason);
  assert(/no vendor quota at all/.test(reason), reason);
});

/** What is worth watching on Connect is reachability and scope. */
test("quota: it points at the check that does answer for Connect", () => {
  assert(/`surface` check/.test(quota.unavailable!.reason!), quota.unavailable!.reason);
});
