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

Deno.test("quota: the reason is dated and names both endpoints", () => {
  const reason = quota.unavailable!.reason!;
  assert(/2026-08-18/.test(reason), "the claim is undated");
  assert(/api\.newrelic\.com/.test(reason), reason);
  assert(/api\.eu\.newrelic\.com/.test(reason), reason);
});

/** Limits exist and are simply not published anywhere readable. */
Deno.test("quota: it distinguishes 'no limits' from 'no published allowance'", () => {
  const reason = quota.unavailable!.reason!;
  assert(/New Relic does apply limits/.test(reason), reason);
  assert(/errors` array inside an HTTP 200/.test(reason), reason);
});

/** What New Relic actually bills for is not requests. */
Deno.test("quota: it points at the consumption that does matter, and how to ask", () => {
  const reason = quota.unavailable!.reason!;
  assert(/data INGESTED/.test(reason), reason);
  assert(/NrConsumption/.test(reason), reason);
  assert(/nrql-query/.test(reason), reason);
});
