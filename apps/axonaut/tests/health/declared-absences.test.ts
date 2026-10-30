import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import service from "../../health/service.ts";
import quota from "../../health/quota.ts";

test("service and quota are declared absences at informational severity", () => {
  for (const h of [service, quota]) {
    assertEquals(h.severity, "informational");
    assertEquals(typeof h.unavailable?.reason, "string");
    assertEquals(h.check, undefined);
  }
  assertEquals(service.kind, "service");
  assertEquals(quota.kind, "quota");
});
