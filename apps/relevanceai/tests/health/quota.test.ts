import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: is a declared absence, not a silent gap", () => {
  assertEquals(quota.key, "quota");
  assertEquals(quota.kind, "quota");
  assert((quota.unavailable?.reason.length ?? 0) > 100);
  // There is no hook at all, which is the point: nothing is probed.
  assertEquals(quota.check, undefined);
});

/**
 * `informational` is load-bearing: an `unavailable` entry always reports
 * `unknown`, and `unknown` outranks `ok` in the roll-up, so at any other
 * severity this would pin the app's verdict at `unknown` forever.
 */
Deno.test("quota: is informational, so it cannot pin the app at unknown", () => {
  assertEquals(quota.severity, "informational");
});

Deno.test("quota: the reason names what was checked and what was found", () => {
  const reason = quota.unavailable!.reason;
  // The headers that were looked for and not found.
  assert(/X-RateLimit-\*/.test(reason), reason);
  // The only usage-plus-limit object in the vendor's schema, and where it lives.
  assert(/GetOrganizationUsageOutput/.test(reason), reason);
  assert(/organization/.test(reason), reason);
  // Credits exist, but only per run.
  assert(/credits_used/.test(reason), reason);
});
