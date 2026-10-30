import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import rateLimit from "../../health/rate-limit.ts";

test("rate-limit: declared unavailable, informational severity", () => {
  assertEquals(typeof rateLimit.check, "undefined");
  assert(rateLimit.unavailable?.reason.length ?? 0 > 0);
  assertEquals(rateLimit.severity, "informational");
});
