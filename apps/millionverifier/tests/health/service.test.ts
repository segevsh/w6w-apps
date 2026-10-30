import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import service from "../../health/service.ts";

test("service: a declared absence at informational severity, no hook", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.severity, "informational");
  assert(service.unavailable?.reason);
  assertEquals(service.check, undefined);
  assertEquals(service.feed, undefined);
});
