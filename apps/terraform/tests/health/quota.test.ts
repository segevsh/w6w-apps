import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

/**
 * Almost every declared absence in this pack says the vendor publishes
 * nothing. This one says the headers exist and describe a window that is over
 * before the result is stored.
 */
Deno.test("quota: is declared unavailable, with no live probe", () => {
  assertEquals(typeof quota.check, "undefined");
  assert(quota.unavailable, "quota declares no reason");
  assertEquals(quota.kind, "quota");
  assertEquals(quota.covers, ["quota"]);
});

Deno.test("quota: the reason states the window, not an absence of headers", () => {
  const reason = quota.unavailable!.reason;
  assert(/30 requests per second/.test(reason), reason);
  assert(/one-second window/.test(reason), reason);
  assert(/accurate, meaningless and reassuring/.test(reason), reason);
});

/** `new Date(reset * 1000)` on a value of 1.0 gives 1 January 1970. */
Deno.test("quota: the reason warns the reset is seconds, not a timestamp", () => {
  const reason = quota.unavailable!.reason;
  assert(/SECONDS, fractional/.test(reason), reason);
  assert(/not a Unix timestamp/.test(reason), reason);
});

/** The budget that is worth watching is not requests. */
Deno.test("quota: names the real budget it cannot see", () => {
  assert(/managed RESOURCE count/.test(quota.unavailable!.reason), quota.unavailable!.reason);
  assert(/fan-out problem/.test(quota.description!), quota.description);
  assertEquals(quota.severity, "informational");
});
