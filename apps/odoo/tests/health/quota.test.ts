import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import check from "../../health/quota.ts";

test("quota: declares that Odoo meters nothing on the external API", () => {
  assertEquals(check.kind, "quota");
  assert(check.unavailable?.reason);
  assertEquals(check.check, undefined);
});

test("quota: is informational, or the declared absence pins the roll-up forever", () => {
  assertEquals(check.severity, "informational");
});

test("quota: the reason cites the absent headers and the real (plan-based) limit", () => {
  const reason = check.unavailable!.reason;
  assert(/RateLimit/i.test(reason));
  assert(/verified/i.test(reason));
  // The commercial gate is an entitlement, not headroom — a quota reading would
  // be the wrong shape for it.
  assert(/plan/i.test(reason));
});
