import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("quota: declared unavailable at informational severity, not a live probe", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  assertEquals(typeof quota.check, "undefined");
  assertEquals(typeof quota.unavailable?.reason, "string");
  assertEquals((quota.unavailable?.reason ?? "").length > 0, true);
});
