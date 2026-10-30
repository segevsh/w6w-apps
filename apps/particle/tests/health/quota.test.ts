import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("quota: is declared unavailable, with no live probe", () => {
  assertEquals(typeof quota.check, "undefined");
  assert(quota.unavailable, "quota declares no reason");
  assertEquals(quota.kind, "quota");
});

test("quota: records that no header exists, and that limits are per endpoint", () => {
  const reason = quota.unavailable!.reason;
  assert(/no `x-ratelimit-\*`/.test(reason), reason);
  assert(/per endpoint rather than per account/.test(reason), reason);
});

/** The budget that actually runs out on a cellular fleet is data. */
test("quota: names cellular data as the real budget", () => {
  const reason = quota.unavailable!.reason;
  assert(/the budget that runs out on a cellular fleet is DATA/.test(reason), reason);
  assert(/looks healthy and responsive/.test(reason), reason);
});

/** A SIM past its limit silences a device in a way that looks like an outage. */
test("quota: points at sim-list as the answerable version", () => {
  const reason = quota.unavailable!.reason;
  assert(/`sim-list` reports per-SIM usage/.test(reason), reason);
  assert(/looks like an outage/.test(reason), reason);
  assertEquals(quota.severity, "informational");
});
