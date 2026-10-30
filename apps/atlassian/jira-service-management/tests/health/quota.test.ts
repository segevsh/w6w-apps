import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import check from "../../health/quota.ts";

test("quota: is declared unavailable and informational, so it never pins the app at unknown", () => {
  assertEquals(check.kind, "quota");
  assertEquals(check.severity, "informational");
  assertEquals(check.check, undefined);
  assertEquals(typeof check.unavailable?.reason, "string");
  assertEquals((check.unavailable!.reason.length ?? 0) > 0, true);
});
