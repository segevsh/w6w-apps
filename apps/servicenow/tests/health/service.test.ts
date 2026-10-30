import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import service from "../../health/service.ts";
import quota from "../../health/quota.ts";

test("service: declared absent, informational so it never pins the roll-up at unknown", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.check, undefined);
  assertEquals(service.severity, "informational");
  assertEquals(typeof service.unavailable?.reason, "string");
});

test("quota: declared absent, informational for the same reason", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.check, undefined);
  assertEquals(quota.severity, "informational");
  assertEquals(typeof quota.unavailable?.reason, "string");
});
