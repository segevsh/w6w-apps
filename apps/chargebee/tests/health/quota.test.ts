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

Deno.test("quota: the reason states the real ceiling and the real failure signal", () => {
  const reason = quota.unavailable!.reason;
  // A reason that just says "not supported" is not worth shipping — this one
  // has to carry the numbers a reader would otherwise go looking for.
  assert(/150/.test(reason), "should name the Starter / test-site ceiling");
  assert(/3500/.test(reason), "should name the Enterprise ceiling");
  assert(/429/.test(reason), "should name how the limit is enforced");
  assert(/api_request_limit_exceeded/.test(reason));
  assert(/Retry-After/i.test(reason));
});

Deno.test("quota: declares no extra egress, having nothing to call", () => {
  assertEquals(quota.network, undefined);
});
