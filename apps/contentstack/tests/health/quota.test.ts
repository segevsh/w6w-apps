import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("quota: a declared absence, informational so it cannot pin the verdict", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  assertEquals(typeof quota.unavailable?.reason, "string");
  assertEquals(quota.check, undefined);
});
