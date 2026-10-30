import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import check from "../../health/quota.ts";

/** Without `informational` the app would sit at `unknown` forever. */
test("quota: declared unavailable with a reason, and informational", () => {
  assertEquals(check.kind, "quota");
  assertEquals(check.severity, "informational");
  assert((check.unavailable?.reason ?? "").length > 40);
  assertEquals(check.check, undefined);
});
