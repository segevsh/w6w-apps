import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { healthCredential, healthScope, healthSeverity } from "@w6w/types";
import service from "../../health/service.ts";
import quota from "../../health/quota.ts";

test("service: is declared absent rather than backed by a guessed probe", () => {
  assertEquals(service.key, "service");
  assertEquals(service.kind, "service");
  assert(service.unavailable?.reason, "must record why no probe exists");
  assertEquals(service.check, undefined);
  // No status host is widened, because no probe reaches one.
  assertEquals(service.network, undefined);
  assertEquals(service.feed, undefined);
});

test("service: the reason names the surfaces that were ruled out for Teams", () => {
  const reason = service.unavailable!.reason;
  assert(reason.includes("ServiceHealth.Read.All"));
  assert(reason.includes("status.cloud.microsoft"));
  assert(reason.includes("401"));
  assert(reason.includes("RSS"));
  // Re-verified for Teams specifically, not inherited from the Outlook write-up.
  assert(reason.includes("Teams has no status host of its own"));
});

test("service: informational, so a permanent `unknown` cannot pin the verdict", () => {
  assertEquals(healthSeverity(service), "informational");
  assertEquals(healthScope(service), "app");
  assertEquals(healthCredential(service), "none");
});

test("quota: is declared absent — Graph exposes no headroom for Teams", () => {
  assertEquals(quota.key, "quota");
  assertEquals(quota.kind, "quota");
  assertEquals(quota.check, undefined);
  assert(quota.unavailable?.reason);
});

test("quota: the reason records the reactive signal and the Teams polling policy", () => {
  const reason = quota.unavailable!.reason;
  assert(reason.includes("429"));
  assert(reason.includes("Retry-After"));
  assert(reason.includes("TooManyRequests"));
  assert(reason.includes("once per day"));
});

test("quota: informational, for the same reason as the service check", () => {
  assertEquals(healthSeverity(quota), "informational");
});
