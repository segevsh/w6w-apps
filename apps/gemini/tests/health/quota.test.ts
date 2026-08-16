import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: declared absence, not a live probe", () => {
  assertEquals(quota.key, "quota");
  assertEquals(quota.kind, "quota");
  assertEquals(quota.check, undefined);
  assert(typeof quota.unavailable?.reason === "string" && quota.unavailable.reason.length > 0);
});

Deno.test("quota: informational — an unavailable check must never outrank ok in the roll-up", () => {
  assertEquals(quota.severity, "informational");
});
