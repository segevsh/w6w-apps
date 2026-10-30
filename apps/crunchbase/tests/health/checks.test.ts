import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import service from "../../health/service.ts";
import quota from "../../health/quota.ts";

test("service: is a declared absence — no vendor status surface exists", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.check, undefined);
  assertEquals(service.severity, "informational");
  assert(service.unavailable?.reason.includes("does not resolve"));
  assert(service.unavailable?.reason.includes("statuspage.io"));
});

test("quota: is a declared absence — the rate limit is documented but not readable back", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.check, undefined);
  assertEquals(quota.severity, "informational");
  assert(quota.unavailable?.reason.includes("200-calls-per-minute"));
});
