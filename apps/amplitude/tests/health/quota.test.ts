import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: is declared unavailable rather than left out", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(typeof quota.check, "undefined");
  assert(quota.unavailable?.reason, "no reason recorded");
});

Deno.test("quota: carries informational severity", () => {
  assertEquals(quota.severity, "informational");
});

Deno.test("quota: the reason is dated and names all four hosts", () => {
  const reason = quota.unavailable!.reason!;
  assert(/2026-08-18/.test(reason), "the claim is undated");
  for (
    const host of [
      "api2.amplitude.com",
      "api.eu.amplitude.com",
      "amplitude.com",
      "analytics.eu.amplitude.com",
    ]
  ) {
    assert(reason.includes(host), `${host} is not named`);
  }
});

/** The two sides are limited differently, and neither publishes an allowance. */
Deno.test("quota: it distinguishes the ingest and query limits", () => {
  const reason = quota.unavailable!.reason!;
  assert(/per user and per device/.test(reason), reason);
  assert(/cost-based/.test(reason), reason);
});

/** A 429 on ingest is a partial failure, and the action returns the indexes. */
Deno.test("quota: it says an ingest 429 is partial, and where the indexes go", () => {
  const reason = quota.unavailable!.reason!;
  assert(/partial\s+failure/.test(reason), reason);
  assert(/event-track/.test(reason), reason);
});
