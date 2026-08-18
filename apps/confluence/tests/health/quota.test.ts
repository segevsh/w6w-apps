import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: is a declared absence, because Atlassian publishes no headroom", () => {
  assertEquals(quota.kind, "quota");
  assert(quota.unavailable?.reason);
  assertEquals(quota.check, undefined);
});

Deno.test("quota: the absence is informational, or it would pin the verdict at unknown", () => {
  // An `unavailable` entry always reports `unknown`, and `unknown` outranks
  // `ok` in the roll-up.
  assertEquals(quota.severity, "informational");
});
