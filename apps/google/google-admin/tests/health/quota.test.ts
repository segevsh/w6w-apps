import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("quota: declared absent with informational severity", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  assertEquals(quota.check, undefined);
  assertEquals(typeof quota.unavailable?.reason, "string");
  assertEquals((quota.unavailable?.reason.length ?? 0) > 0, true);
});
