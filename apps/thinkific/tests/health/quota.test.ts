import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: declared unavailable, no check hook, informational severity", () => {
  assertEquals(typeof quota.check, "undefined");
  assert(quota.unavailable?.reason && quota.unavailable.reason.length > 0);
  assertEquals(quota.severity, "informational");
});

Deno.test("quota: the reason explains WHY (no proactive header), not just that it's missing", () => {
  const reason = quota.unavailable!.reason;
  assert(/RateLimit-Reset/.test(reason));
  assert(/429/.test(reason));
});
