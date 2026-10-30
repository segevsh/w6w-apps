import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("quota: declared unavailable (FreeAgent publishes no remaining-quota header)", () => {
  assertEquals(typeof quota.check, "undefined");
  assert(quota.unavailable?.reason.length && quota.unavailable.reason.length > 0);
});

test("quota: unavailable checks must be informational, never fatal/degraded", () => {
  assertEquals(quota.severity, "informational");
});
