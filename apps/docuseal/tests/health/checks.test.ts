import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";
import quota from "../../health/quota.ts";

/**
 * Both checks are declared absences, not probes — DocuSeal publishes no
 * status page and no rate-limit header. There is no `check` hook to invoke.
 */
Deno.test("service: a declared absence, informational so it never pins the verdict at unknown", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.check, undefined);
  assertEquals(service.severity, "informational");
  assert(service.unavailable, "service must declare unavailable");
  assert(service.unavailable!.reason.includes("statuspage.io"), service.unavailable!.reason);
});

Deno.test("quota: a declared absence, informational for the same reason", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.check, undefined);
  assertEquals(quota.severity, "informational");
  assert(quota.unavailable, "quota must declare unavailable");
  assert(quota.unavailable!.reason.includes("429"), quota.unavailable!.reason);
});
