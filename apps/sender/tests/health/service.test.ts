import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import service from "../../health/service.ts";

test("service: declared unavailable with an informational severity", () => {
  assertEquals(service.check, undefined);
  assertEquals(service.severity, "informational");
  assertEquals(typeof service.unavailable?.reason, "string");
  assertEquals((service.unavailable?.reason.length ?? 0) > 0, true);
});

test("service: app-scoped, no-credential, kind service", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.scope, "app");
  assertEquals(service.credential, "none");
});
