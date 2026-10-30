import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("quota: is declared unavailable, with no hook to run", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(typeof quota.check, "undefined");
  assert(quota.unavailable, "an absent probe must be declared, not omitted");
});

test("quota: is informational, so `unknown` never worsens a roll-up", () => {
  assertEquals(quota.severity, "informational");
});

test("quota: the reason states the one documented limit", () => {
  assert(/4\s+requests\/second/.test(quota.unavailable!.reason));
});
