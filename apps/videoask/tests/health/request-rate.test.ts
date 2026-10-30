import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import requestRate from "../../health/request-rate.ts";

test("request-rate: declared unavailable, informational, no check hook", () => {
  assertEquals(typeof requestRate.check, "undefined");
  assertEquals(typeof requestRate.unavailable?.reason, "string");
  assertEquals(requestRate.severity, "informational");
});
