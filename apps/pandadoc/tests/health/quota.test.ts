import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("quota: is declared absent rather than omitted", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.check, undefined);
  assert(quota.unavailable?.reason);
});

test("quota: an absent check is informational so it never pins a verdict", () => {
  // An `unavailable` entry always reports `unknown`; `informational` keeps that
  // from worsening the app's roll-up forever.
  assertEquals(quota.severity, "informational");
});

test("quota: the reason names why headroom cannot be read", () => {
  const reason = quota.unavailable!.reason!;
  assert(/no usage endpoint/i.test(reason), reason);
  assert(/RateLimit/i.test(reason), reason);
  assert(/429/.test(reason), reason);
});
