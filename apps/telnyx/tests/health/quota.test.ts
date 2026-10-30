import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("quota: is declared unavailable rather than omitted or faked", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.check, undefined);
  assert(quota.unavailable !== undefined);
});

/**
 * An `unavailable` entry reports `unknown`. At the default `degraded` severity
 * that would pin the whole app at `unknown` forever, so this is not optional.
 */
test("quota: is informational, so it cannot pin the app at unknown", () => {
  assertEquals(quota.severity, "informational");
});

test("quota: the reason names what was actually checked", () => {
  const reason = quota.unavailable!.reason;
  assert(/rate-limit/i.test(reason), reason);
  assert(/OpenAPI/i.test(reason), reason);
  assert(reason.length > 0);
});

/** An unavailable check has no hook, so it cannot widen egress either. */
test("quota: declares no network allowlist", () => {
  assertEquals(quota.network, undefined);
});
