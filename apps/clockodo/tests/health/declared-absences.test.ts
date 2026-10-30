import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import service from "../../health/service.ts";
import quota from "../../health/quota.ts";

test("declared absences: service and quota are unavailable with informational severity", () => {
  for (const h of [service, quota]) {
    assertEquals(h.severity, "informational", h.key);
    assert(h.unavailable?.reason && h.unavailable.reason.length > 0, h.key);
    assertEquals(h.check, undefined, h.key);
  }
  assertEquals(service.kind, "service");
  assertEquals(quota.kind, "quota");
});
