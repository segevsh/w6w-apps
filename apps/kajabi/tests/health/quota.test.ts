import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: declares an absence rather than a probe", () => {
  assertEquals(quota.key, "quota");
  assertEquals(quota.kind, "quota");
  assertEquals(quota.check, undefined, "declares both a probe and an absence");
  assert(quota.unavailable?.reason);
});

/**
 * Load-bearing: an `unavailable` entry reports `unknown`, and `unknown`
 * outranks `ok` in the roll-up. At any other severity this declared absence
 * would pin the app at `unknown` forever.
 */
Deno.test("quota: is informational, so it cannot pin the app at unknown", () => {
  assertEquals(quota.severity, "informational");
});

/** An absence has nothing to reach, so it must not widen egress. */
Deno.test("quota: widens no egress", () => {
  assertEquals(quota.network, undefined);
});

/**
 * The reason has to survive a reader asking "how do you know?". It cites the
 * four checks made on 2026-08-03 rather than asserting an absence flatly, and
 * it is careful not to over-claim: Kajabi sits behind Cloudflare, so edge
 * limits very likely exist — what is missing is a *readable remainder*.
 */
Deno.test("quota: the reason states the evidence and does not over-claim", () => {
  const reason = quota.unavailable!.reason;
  assert(reason.includes("OpenAPI"), "does not cite the spec");
  assert(reason.includes("429"), "does not mention the absent 429 declaration");
  assert(reason.includes("RateLimit"), "does not mention the absent headers");
  assert(reason.includes("Cloudflare"), "over-claims that no limit exists at all");
});
