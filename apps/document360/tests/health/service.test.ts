import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import service from "../../health/service.ts";

test("service: a declared absence at informational severity, with no hook", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.severity, "informational");
  assertEquals(service.check, undefined);
  assertEquals(typeof service.unavailable?.reason, "string");
});
