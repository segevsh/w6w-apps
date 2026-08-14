import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

/**
 * Wufoo enforces two real limits and publishes neither: a per-key daily request
 * allowance that varies by plan, and 50 entry submissions per user per 5-minute
 * window. Both are enforced by refusal, so there is nothing to read before they
 * run out. Declaring the absence is what keeps the app's health surface from
 * sitting at `unknown` forever.
 */
Deno.test("quota: declared unavailable with a reason, and no probe", () => {
  assertEquals(quota.key, "quota");
  assertEquals(quota.kind, "quota");
  assertEquals(quota.check, undefined);
  assert(typeof quota.unavailable?.reason === "string" && quota.unavailable.reason.length > 0);
});

/**
 * `informational` is load-bearing: at the default severity a check that cannot
 * run would drag the app's rolled-up health down permanently.
 */
Deno.test("quota: informational, so the absence cannot degrade the app", () => {
  assertEquals(quota.severity, "informational");
  assertEquals(quota.covers, ["*"]);
});

/**
 * The reason names both limits and the observed refusal body, so a later reader
 * knows the limits are real and only the *headroom* is unreadable.
 */
Deno.test("quota: the reason records both enforced limits", () => {
  const reason = quota.unavailable!.reason!;
  assert(reason.includes("daily"), reason);
  assert(reason.includes("50 entry submissions"), reason);
  assert(reason.includes("Slow Down"), reason);
});

/** No probe means no host to reach — a declared allowlist here would be dead weight. */
Deno.test("quota: declares no network allowance", () => {
  assertEquals(quota.network, undefined);
});
