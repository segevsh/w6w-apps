import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import check from "../../health/quota.ts";

test("quota: is declared unavailable rather than omitted", () => {
  assertEquals(check.key, "quota");
  assertEquals(check.kind, "quota");
  assert(check.unavailable, "must declare why the check cannot run");
  assertEquals(check.check, undefined, "an unavailable check carries no hook");
});

test("quota: is informational, so a permanent `unknown` never pins the verdict", () => {
  assertEquals(check.severity, "informational");
});

test("quota: widens no egress — there is nothing to probe", () => {
  assertEquals(check.network, undefined);
});

test("quota: the reason names the documented allowance and why it is not a reading", () => {
  const reason = check.unavailable?.reason ?? "";
  assert(reason.includes("4 requests/second"), "should cite the per-second limit");
  assert(reason.includes("10,000 requests/day"), "should cite the daily limit");
  assert(/no rate-limit response headers/i.test(reason), "should say why it cannot be read");
});
