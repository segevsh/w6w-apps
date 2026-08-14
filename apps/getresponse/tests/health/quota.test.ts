import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

/**
 * GetResponse throttles by refusal (429, code 1015) and publishes no
 * `RateLimit-*` / `Retry-After` header, so there is nothing to read before the
 * budget runs out. Declaring the absence is what keeps the app's health surface
 * from sitting at `unknown` forever.
 */
Deno.test("quota: declared unavailable with a stated reason, and no probe", () => {
  assertEquals(quota.key, "quota");
  assertEquals(quota.kind, "quota");
  assertEquals(quota.check, undefined);
  assert(typeof quota.unavailable?.reason === "string" && quota.unavailable.reason.length > 0);
});

/**
 * `informational` is load-bearing: at the default severity an unavailable check
 * would drag the app's rolled-up health down over a probe that does not exist.
 */
Deno.test("quota: informational, so the absence cannot degrade the app", () => {
  assertEquals(quota.severity, "informational");
  assertEquals(quota.covers, ["*"]);
});

/**
 * The reason names the sending-limits endpoint on purpose. It is the obvious
 * thing to reach for and it reports an EMAIL allowance, not API headroom — a
 * future reader who wires it up would be publishing the wrong number.
 */
Deno.test("quota: the reason records why sending-limits is not the answer", () => {
  const reason = quota.unavailable!.reason!;
  assert(reason.includes("sending-limits"), reason);
  assert(reason.includes("1015"), reason);
});
