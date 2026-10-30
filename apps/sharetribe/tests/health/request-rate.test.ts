import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import requestRate from "../../health/request-rate.ts";

test("request-rate: a declared absence at informational severity, with no check hook", () => {
  assertEquals(requestRate.severity, "informational");
  assertEquals(requestRate.check, undefined);
  assertEquals(typeof requestRate.unavailable?.reason, "string");
  assertEquals(requestRate.unavailable!.reason.length > 0, true);
});
