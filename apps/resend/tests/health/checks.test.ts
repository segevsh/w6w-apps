import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";
import service from "../../health/service.ts";

/**
 * Both of Resend's out-of-band checks are declared absences, and both had to be
 * verified before being written off — status.resend.com answers 200 on every
 * path, which is exactly the shape that produces a check that is green during
 * an outage.
 */
Deno.test("service: is a declared absence, not a probe of the fake status page", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.check, undefined);
  assert(service.unavailable?.reason.includes("HTML SPA shell"));
  // No egress is widened for a check that makes no request.
  assertEquals(service.network, undefined);
});

Deno.test("quota: is a declared absence, with the per-team limit recorded", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.check, undefined);
  assert(quota.unavailable?.reason.includes("10 requests/second per team"));
});

Deno.test("both absences are informational, or they would pin the verdict at unknown", () => {
  // An `unavailable` entry always reports `unknown`, and `unknown` outranks
  // `ok` in the roll-up.
  assertEquals(service.severity, "informational");
  assertEquals(quota.severity, "informational");
});
