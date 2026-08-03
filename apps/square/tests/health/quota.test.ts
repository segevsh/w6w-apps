import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: is declared unavailable with a reason, not silently omitted", () => {
  assertEquals(quota.key, "quota");
  assertEquals(quota.kind, "quota");
  assertEquals(quota.check, undefined);
  assert(quota.unavailable?.reason, "unavailable check carries no reason");
});

Deno.test("quota: the reason names what was looked for and not found", () => {
  const reason = quota.unavailable!.reason;
  assert(/rate-limit response header/i.test(reason), reason);
  assert(/429|RATE_LIMIT/i.test(reason), reason);
});

Deno.test("quota: is informational, so a permanent unknown never worsens the verdict", () => {
  assertEquals(quota.severity, "informational");
});
