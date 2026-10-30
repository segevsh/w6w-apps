import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("quota: declared unavailable, informational severity, no check hook", () => {
  assertEquals(typeof quota.check, "undefined");
  assertEquals(typeof quota.unavailable?.reason, "string");
  assertEquals(quota.severity, "informational");
  assertEquals(quota.kind, "quota");
});
