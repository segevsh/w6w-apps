import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("health/quota: declared unavailable, informational", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(typeof quota.check, "undefined");
  assert((quota.unavailable?.reason?.length ?? 0) > 0);
  assertEquals(quota.severity, "informational");
});
