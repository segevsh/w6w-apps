import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

/**
 * HeyReach documents a 429 on every operation and publishes no rate-limit header
 * and no quota endpoint — so there is nothing to read, which is a fact worth
 * declaring rather than leaving as a silent gap.
 */
Deno.test("health/quota: headroom is a declared absence, at informational severity", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.check, undefined);
  assertEquals(quota.severity, "informational");
  assert(quota.unavailable !== undefined);
});

Deno.test("health/quota: the reason says why nothing can be read", () => {
  const reason = quota.unavailable!.reason;
  assert(/429/.test(reason), reason);
  assert(/rate-limit header/.test(reason), reason);
});
