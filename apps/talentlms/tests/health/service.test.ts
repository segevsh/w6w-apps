import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import check from "../../health/service.ts";

test("service: is a declared absence at informational severity", () => {
  assertEquals(check.kind, "service");
  assertEquals(check.severity, "informational");
  assertEquals(check.check, undefined);
  assertEquals(typeof check.unavailable?.reason, "string");
});
