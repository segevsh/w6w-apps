import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import requestRate from "../../health/request-rate.ts";

test("request-rate: is a declared absence with informational severity and no hook", () => {
  assertEquals(requestRate.kind, "quota");
  assertEquals(requestRate.severity, "informational");
  assertEquals(requestRate.check, undefined);
  assert(requestRate.unavailable?.reason.includes("200/minute"));
});
