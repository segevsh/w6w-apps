import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import service from "../../health/service.ts";

test("service: a declared absence at informational severity, with no hook", () => {
  assertEquals(service.severity, "informational");
  assert(service.unavailable?.reason.includes("status.linkupapi.com"));
  assertEquals(service.check, undefined);
});
