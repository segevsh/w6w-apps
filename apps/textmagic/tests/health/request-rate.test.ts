import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import requestRate from "../../health/request-rate.ts";

test("request-rate: declared unavailable at informational severity", () => {
  assertEquals(requestRate.check, undefined);
  assertEquals(requestRate.severity, "informational");
  assert(requestRate.unavailable?.reason && requestRate.unavailable.reason.length > 0);
});
