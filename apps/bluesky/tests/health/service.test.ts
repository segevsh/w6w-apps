import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import service from "../../health/service.ts";

/** A working JSON route exists and is deliberately not used. */
test("service: is declared unavailable rather than left out", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.scope, "app");
  assertEquals(typeof service.check, "undefined");
  assert(service.unavailable?.reason, "no reason recorded");
});

test("service: carries informational severity, so the app is not stuck at unknown", () => {
  assertEquals(service.severity, "informational");
  assertEquals(service.credential, "none");
});

test("service: the reason is dated and names what was actually probed", () => {
  const reason = service.unavailable!.reason!;
  assert(/2026-08-18/.test(reason), "the claim is undated");
  assert(/UptimeRobot/.test(reason), reason);
  assert(/summary\.json/.test(reason), reason);
});

/**
 * The decisive objection: the only JSON route is keyed by a token scraped from
 * the page's own JavaScript, which is a frontend detail rather than a contract.
 */
test("service: it names the route it declines and why", () => {
  const reason = service.unavailable!.reason!;
  assert(/getMonitorList/.test(reason), reason);
  assert(/pspApiPath/.test(reason), reason);
  assert(/posthog/.test(reason), "the precedent is not cited");
});

/** The other two objections: wrong granularity, and silence about self-hosting. */
test("service: it explains why the monitors would not answer the question anyway", () => {
  const reason = service.unavailable!.reason!;
  assert(/host\.bsky\.network/.test(reason), reason);
  assert(/self-hosted/.test(reason), reason);
  assert(/`pds`/.test(reason), "it does not point at the check that does answer");
});
