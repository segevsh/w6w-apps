import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: is declared unavailable, with no live probe", () => {
  assertEquals(typeof quota.check, "undefined");
  assert(quota.unavailable, "quota declares no reason");
  assertEquals(quota.kind, "quota");
  assertEquals(quota.covers, ["quota"]);
});

/** There is no header to read — this is an absence, not a design choice. */
Deno.test("quota: the reason states the limit and that no header carries it", () => {
  const reason = quota.unavailable!.reason;
  assert(/100 requests per minute per PROJECT/.test(reason), reason);
  assert(/no `x-ratelimit-\*`/.test(reason), reason);
  assert(/no `retry-after` before a 429/.test(reason), reason);
});

/** A cluster refuses changes for minutes; 409 arrives long before 429. */
Deno.test("quota: names the constraint that actually binds instead", () => {
  const reason = quota.unavailable!.reason;
  assert(/409 arrives long before a 429/.test(reason), reason);
  assert(/not IDLE/.test(reason), reason);
});

/** The budget worth watching in Atlas is cost, reported after the fact. */
Deno.test("quota: says what the real budget is and why it is not headroom", () => {
  assert(/budget is cost/.test(quota.unavailable!.reason), quota.unavailable!.reason);
  assertEquals(quota.severity, "informational");
  assertEquals(quota.credential, "none");
});
