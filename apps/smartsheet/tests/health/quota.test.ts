import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: is a declared absence, not a silent gap", () => {
  assertEquals(quota.key, "quota");
  assertEquals(quota.kind, "quota");
  assertEquals(quota.check, undefined);
  assert(quota.unavailable !== undefined);
});

Deno.test("quota: is informational, so a permanent `unknown` cannot pin the verdict", () => {
  assertEquals(quota.severity, "informational");
});

Deno.test("quota: declares no extra egress, having no hook to run", () => {
  assertEquals(quota.network, undefined);
});

Deno.test("quota: the reason cites the real limits and the real reason there is no probe", () => {
  const reason = quota.unavailable!.reason;
  // 300/min general, 30/min on heavy endpoints, errorCode 4003 — all from the
  // vendor's own rate-limiting guide.
  assert(/300 requests\/minute/.test(reason));
  assert(/30\/minute/.test(reason));
  assert(/4003/.test(reason));
  // And the actual finding: no header exposes headroom.
  assert(/no rate-limit headers/.test(reason));
});
