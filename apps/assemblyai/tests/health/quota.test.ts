import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("quota: declared as an unavailable, informational-severity check", () => {
  assertEquals(quota.check, undefined);
  assertEquals(quota.severity, "informational");
  assertEquals(quota.kind, "quota");
  assertEquals(typeof quota.unavailable?.reason, "string");
  assertEquals((quota.unavailable?.reason.length ?? 0) > 0, true);
});

test("quota: explains BOTH unreadable dimensions (balance and rate-limit headroom)", () => {
  const reason = quota.unavailable?.reason ?? "";
  assertEquals(reason.toLowerCase().includes("balance"), true);
  assertEquals(reason.toLowerCase().includes("rate-limit"), true);
});
