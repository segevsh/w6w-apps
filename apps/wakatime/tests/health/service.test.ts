import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";
import quota from "../../health/quota.ts";

Deno.test("service and quota: declared unavailable with a reason, informational", () => {
  for (const h of [service, quota]) {
    assertEquals(h.severity, "informational");
    assert(h.unavailable?.reason && h.unavailable.reason.length > 20, h.key);
    assertEquals(h.check, undefined);
  }
  assertEquals(service.kind, "service");
  assertEquals(quota.kind, "quota");
});
