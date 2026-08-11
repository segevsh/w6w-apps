import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: is a declared absence, not a probe", () => {
  assertEquals(quota.key, "quota");
  assertEquals(quota.kind, "quota");
  assertEquals(quota.check, undefined);
  assertEquals(typeof quota.unavailable?.reason, "string");
});

/**
 * Load-bearing, not decoration. An `unavailable` entry always reports
 * `unknown`, and `unknown` outranks `ok` in the roll-up — so at any other
 * severity, stating "Splitwise publishes no quota surface" would pin this app's
 * health verdict at `unknown` permanently.
 */
Deno.test("quota: the declared absence is informational", () => {
  assertEquals(quota.severity, "informational");
});

Deno.test("quota: the reason states what was measured, not just that nothing exists", () => {
  const reason = quota.unavailable!.reason;
  assert(/X-RateLimit/.test(reason), reason);
  assert(/Retry-After/.test(reason), reason);
  assert(/2026-08-11/.test(reason), reason);
  assert(/429/.test(reason), reason);
});
