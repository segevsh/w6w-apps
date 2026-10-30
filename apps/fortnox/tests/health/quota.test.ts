import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("quota: a declared absence, informational so it cannot pin the verdict at unknown", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  assertEquals(quota.check, undefined);
  assert(quota.unavailable?.reason.includes("25 requests per 5 seconds"));
  assertEquals(quota.network, undefined);
});
