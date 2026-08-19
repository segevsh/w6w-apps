import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: is declared unavailable, with no live probe", () => {
  assertEquals(typeof quota.check, "undefined");
  assert(quota.unavailable, "quota declares no reason");
  assertEquals(quota.kind, "quota");
  assertEquals(quota.covers, ["quota"]);
});

/** There is no header at all — verified, not assumed. */
Deno.test("quota: the reason records what was checked for and not found", () => {
  const reason = quota.unavailable!.reason;
  assert(/no `x-ratelimit-\*`/.test(reason), reason);
  assert(/no `retry-after` before a 429/.test(reason), reason);
  assert(/2026-08-19/.test(reason), reason);
});

/** The real limit is per-object, which no account-level number describes. */
Deno.test("quota: names the per-object write limit as the actual constraint", () => {
  const reason = quota.unavailable!.reason;
  assert(/one write per second to a single object name/.test(reason), reason);
  assert(/overall request volume scales freely/.test(reason), reason);
});

/** The point of saying so: there is a fix, and it is an action in this app. */
Deno.test("quota: points at object-compose as the way round it", () => {
  assert(/`object-compose` is the fix/.test(quota.unavailable!.reason), quota.unavailable!.reason);
  assertEquals(quota.severity, "informational");
});
