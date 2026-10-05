import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";
import service from "../../health/service.ts";

for (const check of [service, quota]) {
  Deno.test(`health: ${check.key} is a declared absence at informational severity`, () => {
    assertEquals(check.check, undefined);
    assertEquals(check.severity, "informational");
    assert(check.unavailable?.reason && check.unavailable.reason.length > 40);
  });
}

Deno.test("health: kinds are service and quota", () => {
  assertEquals(service.kind, "service");
  assertEquals(quota.kind, "quota");
});
