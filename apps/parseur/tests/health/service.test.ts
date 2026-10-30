import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import service from "../../health/service.ts";

test("service: is a declared absence, not a live probe", () => {
  assertEquals(typeof service.check, "undefined");
  assertEquals(typeof service.unavailable?.reason, "string");
  assert(service.unavailable!.reason.length > 0);
});

test("service: is informational so it never pins the app's verdict at unknown", () => {
  assertEquals(service.severity, "informational");
});
