import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import service from "../../health/service.ts";

test("service: declared unavailable at informational severity, with no hook", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.severity, "informational");
  assertEquals(typeof service.unavailable?.reason, "string");
  assertEquals(service.check, undefined);
  assertEquals(service.feed, undefined);
});
