import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: is declared unavailable rather than faked", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(typeof quota.check, "undefined");
  assert(quota.unavailable, "must carry an `unavailable` declaration");
});

Deno.test("quota: is informational — an unavailable check reports unknown forever", () => {
  // At the default `degraded` severity this entry's permanent `unknown` would
  // propagate into every roll-up and pin the app at unknown.
  assertEquals(quota.severity, "informational");
});

Deno.test("quota: the reason states what was checked, not just that nothing was found", () => {
  const reason = quota.unavailable!.reason;
  assert(reason.includes("2026-08-03"), "must date the evidence");
  assert(/header/i.test(reason), "must say headers were checked");
  assert(reason.includes("app.manychat.com"), "must point a human at where the answer lives");
});
