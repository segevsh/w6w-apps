import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";
import app from "../../index.ts";

/**
 * Streamtime publishes nothing to probe: the words "rate limit", "quota" and
 * "throttle" do not appear in its swagger document, and no response header
 * carried a limit, a remaining count or a retry hint on 2026-09-22. The check is
 * therefore a declared absence rather than a probe that happens to fail.
 */
Deno.test("quota: it declares an absence instead of installing a check hook", () => {
  assertEquals(quota.key, "quota");
  assertEquals(quota.kind, "quota");
  assertEquals(quota.check, undefined);
  assert(typeof quota.unavailable?.reason === "string");
  assert(quota.unavailable!.reason.length > 0);
  assert(/swagger/i.test(quota.unavailable!.reason), quota.unavailable!.reason);
  assert(/header/i.test(quota.unavailable!.reason), quota.unavailable!.reason);
});

/**
 * An `unavailable` check always resolves to `unknown`, and `unknown` outranks
 * `ok`, so at any severity but informational this pins the App at `unknown`
 * forever.
 */
Deno.test("quota: it is informational, which is what keeps the App reportable", () => {
  assertEquals(quota.severity, "informational");
});

Deno.test("quota: it makes no request at all", () => {
  assertEquals(quota.credential, "none");
  assertEquals(quota.network, undefined);
});

Deno.test("quota: it is declared in the app, not orphaned in health/", () => {
  assertEquals(app.healthChecks.find((h) => h.key === "quota"), quota);
});
