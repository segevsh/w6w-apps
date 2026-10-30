import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("quota: declares itself unavailable with a stated reason", () => {
  assertEquals(quota.key, "quota");
  assertEquals(quota.kind, "quota");
  assert(quota.unavailable?.reason);
  assertEquals(quota.check, undefined);
});

test("quota: is informational, so it never worsens a roll-up verdict", () => {
  assertEquals(quota.severity, "informational");
});

test("quota: the reason names WordPress' own REST API as the reason nothing is readable", () => {
  assert(/WordPress REST API/i.test(quota.unavailable!.reason));
});

test("quota: widens no egress", () => {
  assertEquals(quota.network, undefined);
});
