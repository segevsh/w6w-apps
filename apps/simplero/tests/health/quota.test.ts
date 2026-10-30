import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("quota: declared unavailable, informational, with no hook", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(typeof quota.check, "undefined");
  assertEquals(quota.severity, "informational");
  assert(quota.unavailable && quota.unavailable.reason.length > 0);
});
