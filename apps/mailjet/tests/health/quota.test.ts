import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("quota: declared unavailable with no check hook", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.check, undefined);
  assert(quota.unavailable, "quota must declare `unavailable` when it has no probe");
});

test("quota: unavailable MUST be informational or it pins the app at unknown forever", () => {
  // An `unavailable` entry always reports `unknown`. At the default `degraded`
  // severity that `unknown` propagates into every roll-up permanently.
  assertEquals(quota.severity, "informational");
});

test("quota: the reason names both missing signals, not just one", () => {
  const reason = quota.unavailable!.reason;
  assert(/rate-limit|X-RateLimit/i.test(reason), "must state that no headers are published");
  assert(/remaining sends|plan limits|credits/i.test(reason), "must state that no endpoint exists");
  assert(reason.length > 80, "an unavailable reason must be a real explanation");
});

test("quota: points a human at where the answer does exist", () => {
  assert(quota.unavailable!.reason.includes("app.mailjet.com"));
});
