import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";
import quota from "../../health/quota.ts";

/**
 * Both checks are declared absences, and each carries the measurement that
 * justifies it — a check that is confidently wrong is worse than no check.
 */
Deno.test("service: is a declared absence, not a missing check", () => {
  assertEquals(service.check, undefined);
  assertEquals(service.severity, "informational");
  const reason = service.unavailable!.reason;
  assert(reason.includes("2026-08-18"), reason);
  // The SPA catch-all: identical bytes on every path.
  assert(reason.includes("257,163"), reason);
  // And the abandoned Statuspage instance.
  assert(reason.includes("2026-04-28"), reason);
  assert(reason.includes("zero unresolved incidents"), reason);
});

Deno.test("quota: is a declared absence because allowance is not consumption", () => {
  assertEquals(quota.check, undefined);
  assertEquals(quota.severity, "informational");
  const reason = quota.unavailable!.reason;
  assert(reason.includes("entitlements"), reason);
  assert(reason.includes("MAXIMUM allowed"), reason);
  assert(reason.includes("no usage, consumed or remaining"), reason);
});

/** Neither absence may claim a health state; both simply do not run. */
Deno.test("both absences are informational, so neither pins the App's verdict", () => {
  for (const check of [service, quota]) {
    assertEquals(check.severity, "informational");
    assertEquals(check.covers, ["*"]);
    assert(check.unavailable!.reason.length > 100, "the reason should carry its evidence");
  }
});
