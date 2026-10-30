import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import service from "../../health/service.ts";

test("service: a declared absence with informational severity and no hook", () => {
  assertEquals(service.severity, "informational");
  assertEquals(service.kind, "service");
  assert(service.unavailable?.reason.includes("example"));
  assertEquals(service.check, undefined);
});
