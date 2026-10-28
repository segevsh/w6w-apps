import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

/** The absence is the finding, and it needs evidence rather than silence. */
Deno.test("quota: is declared unavailable rather than left out", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(typeof quota.check, "undefined");
  assert(quota.unavailable?.reason, "no reason recorded");
});

/** Without this the app sits at `unknown` forever. */
Deno.test("quota: carries informational severity", () => {
  assertEquals(quota.severity, "informational");
});

Deno.test("quota: the reason is dated and says what was actually checked", () => {
  const reason = quota.unavailable!.reason!;
  assert(/2026-08-18/.test(reason), "the claim is undated");
  assert(/X-RateLimit/.test(reason), reason);
  assert(/server-timing/.test(reason), reason);
});

/**
 * The distinction that keeps this from being a gap: what arrives in-band is
 * failure, not headroom, and the actions surface it.
 */
Deno.test("quota: names the two failure signals that DO arrive in-band", () => {
  const reason = quota.unavailable!.reason!;
  assert(/OVER_QUERY_LIMIT/.test(reason), reason);
  assert(/429/.test(reason), reason);
});

Deno.test("quota: says where the real numbers live, and why not here", () => {
  const reason = quota.unavailable!.reason!;
  assert(/Cloud Monitoring/.test(reason), reason);
  assert(/service account/.test(reason), reason);
});
