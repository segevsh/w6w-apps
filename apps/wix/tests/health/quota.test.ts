import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: declares its absence rather than leaving a silent gap", () => {
  assertEquals(quota.key, "quota");
  assertEquals(quota.kind, "quota");
  assert(quota.unavailable, "must carry an `unavailable` reason");
  assert(
    quota.unavailable!.reason.length > 0,
    "an unavailable entry without a reason is a silent gap by another name",
  );
});

Deno.test("quota: has no check hook — there is nothing on the wire to read", () => {
  assertEquals(quota.check, undefined);
});

Deno.test("quota: is informational, so a permanent `unknown` cannot pin the verdict", () => {
  // An `unavailable` entry always reports `unknown`, and `unknown` outranks
  // `ok` in the roll-up. At any other severity this would peg the app's health
  // at `unknown` forever.
  assertEquals(quota.severity, "informational");
});

Deno.test("quota: the reason names what was checked, not just that it failed", () => {
  const reason = quota.unavailable!.reason;
  assert(reason.includes("RateLimit"), "should name the header family that is absent");
  assert(/200 requests\/minute/.test(reason), "should cite the documented allowance");
});
