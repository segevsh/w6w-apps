import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import service from "../../health/service.ts";

test("health/service: declared absent, informational, so it never pins the roll-up at unknown", () => {
  assertEquals(service.check, undefined);
  assertEquals(service.severity, "informational");
  assert(service.unavailable?.reason.length ?? 0 > 0, "expected a reason");
});
