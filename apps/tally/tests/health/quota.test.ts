import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("quota: is declared absent rather than omitted", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.check, undefined);
  assert(quota.unavailable, "quota must declare why it cannot be probed");
});

test("quota: is informational so a permanent unknown never pins the verdict", () => {
  assertEquals(quota.severity, "informational");
});

test("quota: states the real documented allowance in its reason", () => {
  const reason = quota.unavailable!.reason;
  assert(reason.includes("100 requests/minute"), reason);
  assert(/rate-limit headers/i.test(reason), reason);
});

test("quota: declares no extra egress — there is nothing to probe", () => {
  assertEquals(quota.network, undefined);
});
