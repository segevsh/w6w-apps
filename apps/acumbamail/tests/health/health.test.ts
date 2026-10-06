import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";
import quota from "../../health/quota.ts";

Deno.test("service: declared absence, informational, no hook", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.severity, "informational");
  assert(service.unavailable?.reason.includes("status.acumbamail.com"));
  assertEquals("check" in service, false);
});

Deno.test("quota: declared absence, informational, no hook", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  assert(quota.unavailable?.reason);
  assertEquals("check" in quota, false);
});
