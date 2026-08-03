import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: is declared unavailable rather than omitted", () => {
  // "We cannot know" is a first-class answer and a better one than a silent gap.
  assertEquals(quota.kind, "quota");
  assertEquals(quota.check, undefined);
  assert(quota.unavailable, "no unavailable entry");
});

Deno.test("quota: the reason states the real limit and why it cannot be read", () => {
  const reason = quota.unavailable!.reason;
  assert(reason.includes("180 requests/minute"), "does not state the documented limit");
  assert(reason.includes("429"), "does not name the only actual signal");
  assert(/no rate-limit header|names no rate-limit header/.test(reason));
});

Deno.test("quota: is informational, so an honest `unknown` never pins the verdict", () => {
  // Without this, reporting the truth would leave the app permanently degraded.
  assertEquals(quota.severity, "informational");
});

Deno.test("quota: declares no egress — there is nothing to reach", () => {
  assertEquals(quota.network, undefined);
  assertEquals(quota.feed, undefined);
});
