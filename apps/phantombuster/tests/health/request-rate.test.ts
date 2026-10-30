import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import requestRate from "../../health/request-rate.ts";

test("request-rate: declared unavailable, informational severity", () => {
  assertEquals(typeof requestRate.check, "undefined");
  assertEquals(typeof requestRate.unavailable?.reason, "string");
  assertEquals(requestRate.severity, "informational");
});

test("request-rate: the reason names both the missing header and the missing docs", () => {
  const reason = requestRate.unavailable!.reason;
  assertEquals(reason.includes("X-RateLimit"), true);
  assertEquals(reason.toLowerCase().includes("no rate-limiting policy"), true);
});
