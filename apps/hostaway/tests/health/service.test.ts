import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";
import quota from "../../health/quota.ts";

Deno.test("service: declares the status-page ABSENCE rather than probing an invented URL", () => {
  assertEquals(service.key, "service");
  assertEquals(service.kind, "service");
  assertEquals(service.check, undefined, "a declared absence must not carry a probe");
  assert(service.unavailable !== undefined);
  assertEquals(service.severity, "informational");
  assertEquals(service.network, undefined, "no status host may be widened into the allowlist");
  assertEquals(service.covers, ["*"]);
});

Deno.test("service: the reason records both dead status hosts by name", () => {
  const reason = service.unavailable!.reason;
  assert(reason.includes("status.hostaway.com"), "must name the non-resolving host");
  assert(reason.includes("hostaway.statuspage.io"), "must name the unclaimed subdomain");
  assert(/302|redirect/i.test(reason), "must record that the Statuspage host redirects away");
  assert(/informational|users\?limit=1/i.test(reason), "must point at what does answer");
});

Deno.test("quota: declares that Hostaway publishes headroom only on a 429", () => {
  assertEquals(quota.key, "quota");
  assertEquals(quota.kind, "quota");
  assertEquals(quota.check, undefined);
  assertEquals(quota.severity, "informational");
  const reason = quota.unavailable!.reason;
  assert(/429 responses only/i.test(reason), "must state the headers' documented scope");
  assert(/X-RateLimit-Retry-After/.test(reason), "must name the retry-at header");
  assert(/30\/minute/.test(reason), "must name the conversation-message limit");
});
