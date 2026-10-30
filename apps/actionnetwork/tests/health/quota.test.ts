import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import check from "../../health/quota.ts";

test("quota: declares there is no rate-limit signal, informationally", () => {
  assertEquals(check.key, "quota");
  assertEquals(check.kind, "quota");
  assertEquals(check.severity, "informational");
  assert(check.unavailable && check.unavailable.reason.length > 0);
  assertEquals(check.check, undefined);
});
