import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("quota: declared unavailable, informational so it cannot pin the verdict to unknown", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  assert(quota.unavailable!.reason.length > 0);
  assertEquals(quota.check, undefined);
});
