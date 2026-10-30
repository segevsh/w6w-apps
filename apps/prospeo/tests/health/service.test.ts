import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import check from "../../health/service.ts";

test("service: a declared absence, informational, with a reason and no hook", () => {
  assertEquals(check.severity, "informational");
  assert(check.unavailable?.reason);
  assertEquals(check.check, undefined);
});
