import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("quota: declared unavailable, informational, no check hook", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  assertEquals(quota.check, undefined);
  assertEquals(typeof quota.unavailable?.reason, "string");
  assertEquals((quota.unavailable?.reason.length ?? 0) > 0, true);
});
