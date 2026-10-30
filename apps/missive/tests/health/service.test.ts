import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import service from "../../health/service.ts";

test("service: declared unavailable, not a live probe", () => {
  assertEquals(typeof service.check, "undefined");
  assert(service.unavailable?.reason.length && service.unavailable.reason.length > 0);
});

test("service: informational severity, so it can never worsen a roll-up on its own", () => {
  assertEquals(service.severity, "informational");
});

test("service: kind is service, scoped to the whole app, unsigned", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.scope, "app");
  assertEquals(service.credential, "none");
});
