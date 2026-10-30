import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import service from "../../health/service.ts";

test("health/service: declared unavailable and informational", () => {
  assertEquals(typeof service.check, "undefined");
  assertEquals(service.severity, "informational");
  assertEquals(typeof service.unavailable?.reason, "string");
  assertEquals(service.unavailable!.reason.length > 0, true);
});
