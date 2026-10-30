import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("quota: a declared absence with informational severity and a reason, no hook", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  assert((quota.unavailable?.reason ?? "").length > 20);
  assertEquals(quota.check, undefined);
});
