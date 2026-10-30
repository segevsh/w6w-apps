import { test } from "node:test";
import { assertEquals, assertExists } from "../_assert.ts";
import service from "../../health/service.ts";

test("service: declared unavailable, no check hook", () => {
  assertEquals(service.check, undefined);
  assertExists(service.unavailable);
  assertEquals(service.severity, "informational");
  assertEquals(service.kind, "service");
});
