import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import service from "../../health/service.ts";

test("service: a declared absence at informational severity, with no probe", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.severity, "informational");
  assertEquals(service.check, undefined);
  assert(service.unavailable!.reason.includes("526"));
});
