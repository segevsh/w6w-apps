import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import service from "../../health/service.ts";

test("service - is declared unavailable with informational severity", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.severity, "informational");
  assertEquals(typeof service.unavailable?.reason, "string");
  assertEquals((service.unavailable?.reason.length ?? 0) > 0, true);
  // A declared-absent check has no `check` hook at all.
  assertEquals("check" in service, false);
});
