import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("health/quota: a declared absence, informational, with no hook", () => {
  assertEquals(quota.key, "quota");
  assertEquals(quota.kind, "quota");
  assertEquals(quota.check, undefined);
  // An `unavailable` entry always reports `unknown`, and `unknown` outranks
  // `ok` in the roll-up — at any other severity this would pin the app's
  // verdict at `unknown` forever.
  assertEquals(quota.severity, "informational");
  assert(quota.unavailable!.reason.includes("rate-limit"));
});
