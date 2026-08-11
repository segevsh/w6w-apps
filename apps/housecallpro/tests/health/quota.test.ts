import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

/**
 * An `unavailable` entry always reports `unknown`, and `unknown` outranks `ok`
 * in the roll-up — so at any other severity this declared absence would pin the
 * app's verdict at `unknown` forever.
 */
Deno.test("quota: a declared absence is informational and carries no hook", () => {
  assertEquals(quota.severity, "informational");
  assertEquals(quota.check, undefined);
  assert(typeof quota.unavailable?.reason === "string");
});

Deno.test("quota: the reason states what was measured, not just that nothing exists", () => {
  const reason = quota.unavailable!.reason;
  assert(reason.includes("X-RateLimit-*"));
  assert(reason.includes("Retry-After"));
  assert(reason.includes("twelve requests in one minute"));
  assert(reason.includes("line_items"));
});
