import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("health/quota: declared absent, informational, no check hook", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.check, undefined);
  assert(typeof quota.unavailable?.reason === "string" && quota.unavailable.reason.length > 0);
  assertEquals(quota.severity, "informational");
});
