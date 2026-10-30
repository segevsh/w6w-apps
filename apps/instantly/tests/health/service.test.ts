import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import service from "../../health/service.ts";

test("health/service: declared unavailable, no check hook", () => {
  assertEquals(typeof service.check, "undefined");
  assertEquals(typeof service.unavailable?.reason, "string");
  assertEquals(service.unavailable!.reason.length > 0, true);
});

test("health/service: informational severity so it never pins the app at unknown", () => {
  assertEquals(service.severity, "informational");
});

test("health/service: kind service, app scope, no credential", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.scope, "app");
  assertEquals(service.credential, "none");
});
