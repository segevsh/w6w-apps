import { assert, assertEquals } from "@std/assert";
import { healthCredential, healthScope, healthSeverity } from "@w6w/types";
import service from "../../health/service.ts";
import quota from "../../health/quota.ts";

Deno.test("service: is declared absent rather than backed by a guessed probe", () => {
  assertEquals(service.key, "service");
  assertEquals(service.kind, "service");
  assert(service.unavailable?.reason, "must record why no probe exists");
  assertEquals(service.check, undefined);
  // No status host is widened, because no probe reaches one.
  assertEquals(service.network, undefined);
  assertEquals(service.feed, undefined);
});

Deno.test("service: the reason names the surfaces that were ruled out for Teams", () => {
  const reason = service.unavailable!.reason;
  assert(reason.includes("ServiceHealth.Read.All"));
  assert(reason.includes("status.cloud.microsoft"));
  assert(reason.includes("401"));
  assert(reason.includes("RSS"));
  // Re-verified for Teams specifically, not inherited from the Outlook write-up.
  assert(reason.includes("Teams has no status host of its own"));
});

Deno.test("service: informational, so a permanent `unknown` cannot pin the verdict", () => {
  assertEquals(healthSeverity(service), "informational");
  assertEquals(healthScope(service), "app");
  assertEquals(healthCredential(service), "none");
});

Deno.test("quota: is declared absent — Graph exposes no headroom for Teams", () => {
  assertEquals(quota.key, "quota");
  assertEquals(quota.kind, "quota");
  assertEquals(quota.check, undefined);
  assert(quota.unavailable?.reason);
});

Deno.test("quota: the reason records the reactive signal and the Teams polling policy", () => {
  const reason = quota.unavailable!.reason;
  assert(reason.includes("429"));
  assert(reason.includes("Retry-After"));
  assert(reason.includes("TooManyRequests"));
  assert(reason.includes("once per day"));
});

Deno.test("quota: informational, for the same reason as the service check", () => {
  assertEquals(healthSeverity(quota), "informational");
});
