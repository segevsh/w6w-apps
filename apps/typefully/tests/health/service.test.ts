import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import service from "../../health/service.ts";

test("service: declared unavailable, informational severity, no check hook", () => {
  assertEquals(typeof service.check, "undefined");
  assertEquals(typeof service.unavailable?.reason, "string");
  assertEquals(service.severity, "informational");
  assertEquals(service.kind, "service");
});
