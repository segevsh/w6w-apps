import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: is declared unavailable rather than omitted or faked", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.check, undefined);
  assert(quota.unavailable !== undefined);
});

/**
 * An `unavailable` entry reports `unknown`. At the default `degraded` severity
 * that would pin the whole app at `unknown` forever, so this is not optional.
 */
Deno.test("quota: is informational, so it cannot pin the app at unknown", () => {
  assertEquals(quota.severity, "informational");
});

/**
 * The reason has to survive review by someone who suspects we simply did not
 * look. It names all three verifications: no header on the wire, nothing in the
 * spec, no endpoint to poll — plus the near-miss that is not one.
 */
Deno.test("quota: the reason names every check that was actually run", () => {
  const reason = quota.unavailable!.reason;
  assert(/RateLimit-\*/.test(reason), reason);
  assert(/Retry-After/.test(reason), reason);
  assert(/OpenAPI/.test(reason), reason);
  assert(/429/.test(reason), reason);
  assert(/no usage or limits endpoint/i.test(reason), reason);
  // `quota_exceeded` exists but is a plan ceiling on object creation, not
  // request allowance. Saying so pre-empts the obvious "but this code exists".
  assert(/quota_exceeded/.test(reason), reason);
  assert(/PLAN ceiling/i.test(reason), reason);
});

Deno.test("quota: records the published fixed limits, which are constants and not a reading", () => {
  const reason = quota.unavailable!.reason;
  assert(/100 read/.test(reason), reason);
  assert(/25 write/.test(reason), reason);
});

/** An unavailable check has no hook, so it cannot widen egress either. */
Deno.test("quota: declares no network allowlist", () => {
  assertEquals(quota.network, undefined);
});
