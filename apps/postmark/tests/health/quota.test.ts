import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("quota: declared unavailable — Postmark exposes no rate-limit headers or credit API", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  assertEquals(quota.check, undefined);
  assert(quota.unavailable, "must declare `unavailable`");
  assert(quota.unavailable!.reason.length > 0);
});
