import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: declared as unavailable rather than omitted", () => {
  assertEquals(quota.kind, "quota");
  assert(quota.unavailable?.reason);
  // No hook: there is nothing to probe, and inventing one would be worse than
  // saying so.
  assertEquals(quota.check, undefined);
});

Deno.test("quota: informational, so a permanent `unknown` never pins the verdict", () => {
  assertEquals(quota.severity, "informational");
});

Deno.test("quota: the reason names the access tiers and the error that surfaces", () => {
  const reason = quota.unavailable!.reason;
  assert(reason.includes("RESOURCE_EXHAUSTED"));
  assert(reason.includes("15,000"));
  assert(reason.includes("Standard"));
});
