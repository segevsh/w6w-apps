import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: is declared unavailable, with no hook to run", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(typeof quota.check, "undefined");
  assert(quota.unavailable, "an absent probe must be declared, not omitted");
});

Deno.test("quota: is informational, so `unknown` never worsens a roll-up", () => {
  assertEquals(quota.severity, "informational");
});

Deno.test("quota: the reason states the one documented limit", () => {
  assert(/4\s+requests\/second/.test(quota.unavailable!.reason));
});
