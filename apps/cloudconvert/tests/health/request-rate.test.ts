import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import requestRate from "../../health/request-rate.ts";

test("request-rate: declares an absence rather than a probe", () => {
  assertEquals(typeof requestRate.check, "undefined");
  assertEquals(typeof requestRate.unavailable?.reason, "string");
  assertEquals((requestRate.unavailable?.reason.length ?? 0) > 0, true);
});

test("request-rate: severity is informational, so it can never pin the app at unknown", () => {
  assertEquals(requestRate.severity, "informational");
});
