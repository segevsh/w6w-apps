import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import service from "../../health/service.ts";

test("service: declares a vendor-status absence at informational severity, with no hook", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.severity, "informational");
  assert(service.unavailable?.reason.includes("status"));
  assertEquals(service.check, undefined);
});
