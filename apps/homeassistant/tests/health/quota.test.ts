import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

/** Your own server has no request quota to report. */
test("quota: is declared unavailable rather than left out", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(typeof quota.check, "undefined");
  assert(quota.unavailable?.reason, "no reason recorded");
});

test("quota: carries informational severity", () => {
  assertEquals(quota.severity, "informational");
});

test("quota: the reason is dated and says what was checked", () => {
  const reason = quota.unavailable!.reason!;
  assert(/2026-08-18/.test(reason), "the claim is undated");
  assert(/no response carries rate-limit headers/.test(reason), reason);
});

/**
 * The honest distinction: a self-hosted instance degrades rather than refuses,
 * which is a different failure mode from a quota.
 */
test("quota: it explains what constrains an instance instead", () => {
  const reason = quota.unavailable!.reason!;
  assert(/latency rather than as refusal/.test(reason), reason);
  assert(/recorder/.test(reason), reason);
});

test("quota: it names the one real limit, and where it is guarded", () => {
  const reason = quota.unavailable!.reason!;
  assert(/filter_entity_id/.test(reason), reason);
  assert(/history-get/.test(reason), reason);
});

test("quota: it notes that Nabu Casa's own limits are out of band", () => {
  assert(/Nabu Casa/.test(quota.unavailable!.reason!), quota.unavailable!.reason);
});
