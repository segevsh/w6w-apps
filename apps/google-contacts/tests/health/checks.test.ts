import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";
import quota from "../../health/quota.ts";

Deno.test("health/service: declared absent — Google publishes no Contacts status surface", () => {
  assertEquals(service.key, "service");
  assertEquals(service.kind, "service");
  assertEquals(service.covers, ["*"]);
  assert(service.unavailable?.reason, "an absent check must say why");
  // No hook: there is nothing honest to probe.
  assertEquals(typeof (service as { check?: unknown }).check, "undefined");
  // Widening egress for a probe that does not exist would be indefensible.
  assertEquals((service as { network?: unknown }).network, undefined);
});

Deno.test("health/service: the reason names the evidence, not just the conclusion", () => {
  const reason = service.unavailable!.reason;
  assert(reason.includes("appsstatus"), "cite the dashboard that was checked");
  assert(reason.includes("people.googleapis.com"), "say where an outage does surface");
});

Deno.test("health/quota: declared absent — no headroom endpoint or rate-limit headers", () => {
  assertEquals(quota.key, "quota");
  assertEquals(quota.kind, "quota");
  assertEquals(quota.covers, ["*"]);
  assert(quota.unavailable?.reason);
  assert(quota.unavailable!.reason.includes("429"), "name how exhaustion actually surfaces");
});

Deno.test("health: both absences are informational, or they pin the verdict at unknown forever", () => {
  for (const check of [service, quota]) {
    assertEquals(check.severity, "informational", `${check.key} must not gate the roll-up`);
  }
});
