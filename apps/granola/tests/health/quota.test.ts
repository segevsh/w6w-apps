import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("quota: declared unavailable with informational severity and no hook", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  assert(quota.unavailable!.reason.length > 0);
  assertEquals(quota.check, undefined);
});
