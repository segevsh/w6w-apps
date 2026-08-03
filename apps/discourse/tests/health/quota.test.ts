import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: declares an absence rather than a probe", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.check, undefined);
  assert(quota.unavailable?.reason && quota.unavailable.reason.length > 0);
  // An absence has nothing to reach, so it must not widen egress.
  assertEquals(quota.network, undefined);
});

Deno.test("quota: is informational, so a declared absence cannot pin the verdict", () => {
  // An `unavailable` entry reports `unknown`, and `unknown` outranks `ok` in the
  // roll-up. At `degraded` (the default for this kind) the App would sit at
  // `unknown` forever.
  assertEquals(quota.severity, "informational");
});

Deno.test("quota: the reason names the actual mechanism, not a vague apology", () => {
  const reason = quota.unavailable!.reason;
  assert(reason.includes("Retry-After"));
  assert(reason.includes("Discourse-Rate-Limit-Error-Code"));
  assert(reason.includes("429"));
});
