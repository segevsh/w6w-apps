import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: Ecwid's unreadable headroom is a declared absence, not a gap", () => {
  assertEquals(quota.key, "quota");
  assertEquals(quota.kind, "quota");
  assert(quota.unavailable, "no declared absence");
  assert(!quota.check, "an unavailable check must not also carry a probe");
  assertEquals(quota.check, undefined);
});

Deno.test("quota: the absence is informational, or the app is unknown forever", () => {
  // An `unavailable` entry always reports `unknown`, and `unknown` outranks `ok`
  // in the roll-up.
  assertEquals(quota.severity, "informational");
});

Deno.test("quota: the reason names the one documented limit and why it cannot be read", () => {
  const reason = quota.unavailable?.reason ?? "";
  assert(/600 requests\/minute/.test(reason), reason);
  assert(/Retry-After/.test(reason), reason);
  assert(/429/.test(reason), reason);
});
