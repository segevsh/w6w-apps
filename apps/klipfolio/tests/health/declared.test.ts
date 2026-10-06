import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";
import quota from "../../health/quota.ts";

Deno.test("service: a declared absence with informational severity and no hook", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.severity, "informational");
  assert(service.unavailable?.reason);
  assertEquals(service.check, undefined);
});

Deno.test("quota: a declared absence with informational severity and no hook", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  assert(quota.unavailable?.reason);
  assertEquals(quota.check, undefined);
});
