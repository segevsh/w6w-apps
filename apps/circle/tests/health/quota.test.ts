import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: declares an absence rather than a probe", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.check, undefined);
  assert(quota.unavailable?.reason);
});

/**
 * Load-bearing. An `unavailable` entry reports `unknown`, and `unknown`
 * outranks `ok` in the roll-up — so at any other severity this declared absence
 * would pin the App's verdict at `unknown` forever.
 */
Deno.test("quota: is informational, so honesty does not cost the App its verdict", () => {
  assertEquals(quota.severity, "informational");
});

Deno.test("quota: an absence has nothing to reach, so it widens no egress", () => {
  assertEquals(quota.network, undefined);
});

Deno.test("quota: the reason states the real limits, not a shrug", () => {
  const reason = quota.unavailable!.reason;
  // The monthly allowance is the one that actually bites — 5,000/month is ~7/hour.
  assert(reason.includes("5,000"), "names the Business-plan monthly allowance");
  assert(reason.includes("2,000"), "names the per-IP rate limit");
  assert(reason.includes("4xx"), "warns that failed calls also spend the allowance");
});
