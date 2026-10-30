import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import service from "../../health/service.ts";

test("service: a declared absence, not a probe", () => {
  assertEquals(typeof service.check, "undefined");
  assertEquals(typeof service.unavailable?.reason, "string");
});

test("service: informational, so it never pins the App at unknown forever", () => {
  assertEquals(service.severity, "informational");
});
