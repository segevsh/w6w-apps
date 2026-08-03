import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

/**
 * `quota` is a declared ABSENCE, not a probe. BambooHR publishes no rate-limit
 * headers, no usage endpoint and no numeric limit — it throttles at its own
 * discretion and signals it only after the fact with a 503 and an optional
 * `Retry-After`. The RFC makes `unavailable` a first-class answer for exactly
 * this, and a better one than a silent gap or an invented always-`ok` check.
 */
Deno.test("quota: declares an absence rather than inventing a probe", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.covers, ["*"]);
  assertEquals(quota.check, undefined, "an unavailable entry must have no hook");
  assert(quota.unavailable, "must declare why no check exists");
  assert(
    (quota.unavailable!.reason ?? "").length > 40,
    "the reason must actually explain, not just assert",
  );
});

Deno.test("quota: is informational, or its permanent unknown would pin the verdict", () => {
  // The RFC calls this out directly: an `unavailable` entry reports a permanent
  // `unknown`, and at any higher severity that would fix the App's roll-up
  // there forever.
  assertEquals(quota.severity, "informational");
});

Deno.test("quota: declares no egress, because it makes no request", () => {
  assertEquals(quota.network, undefined);
  assertEquals(quota.feed, undefined, "feed and unavailable are mutually exclusive");
});
