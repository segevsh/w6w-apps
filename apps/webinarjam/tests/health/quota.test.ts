import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("quota: is a declared absence, not a guess", () => {
  assertEquals(typeof quota.check, "undefined");
  assertEquals(quota.severity, "informational");
  assert(quota.unavailable!.reason.length > 0);
});
