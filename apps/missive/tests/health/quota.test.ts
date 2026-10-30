import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("quota: declared unavailable, not a live probe", () => {
  assertEquals(typeof quota.check, "undefined");
  assert(quota.unavailable?.reason.length && quota.unavailable.reason.length > 0);
});

test("quota: informational severity, so it can never worsen a roll-up on its own", () => {
  assertEquals(quota.severity, "informational");
});

test("quota: kind is quota, covers everything", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.covers, ["*"]);
});
