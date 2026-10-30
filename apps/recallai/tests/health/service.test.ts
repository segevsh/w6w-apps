import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import service from "../../health/service.ts";
import quota from "../../health/quota.ts";

test("service and quota are declared absences, informational, with a reason and no hook", () => {
  for (const h of [service, quota]) {
    assertEquals(h.severity, "informational");
    assert(h.unavailable!.reason.length > 20);
    assertEquals(h.check, undefined);
  }
  assertEquals(service.kind, "service");
  assertEquals(quota.kind, "quota");
});
