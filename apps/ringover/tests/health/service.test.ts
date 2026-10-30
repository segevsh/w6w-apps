import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import service from "../../health/service.ts";

test("service: declared unavailable with informational severity, no hook", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.severity, "informational");
  assert(service.unavailable?.reason.includes("status.ringover.com"));
  assertEquals(service.check, undefined);
});
