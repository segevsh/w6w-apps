import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import service from "../../health/service.ts";
import quota from "../../health/quota.ts";

test("health: service and quota are declared absences with informational severity", () => {
  for (const [check, kind] of [[service, "service"], [quota, "quota"]] as const) {
    assertEquals(check.key, kind);
    assertEquals(check.kind, kind);
    assertEquals(check.severity, "informational");
    assert(check.unavailable?.reason.length);
    assertEquals("check" in check, false);
  }
});
