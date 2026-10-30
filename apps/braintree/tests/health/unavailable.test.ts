import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import service from "../../health/service.ts";
import quota from "../../health/quota.ts";

test("service and quota: declared unavailable at informational severity, with a reason, no hook", () => {
  for (const h of [service, quota]) {
    assertEquals(h.severity, "informational");
    assert(h.unavailable!.reason.length > 20);
    assertEquals(h.check, undefined);
    assertEquals(h.feed, undefined);
  }
  assertEquals([service.kind, quota.kind], ["service", "quota"]);
});
