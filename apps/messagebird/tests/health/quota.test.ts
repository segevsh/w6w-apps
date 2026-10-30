import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("quota: is a declared absence at informational severity", () => {
  assertEquals(quota.severity, "informational");
  assertEquals(typeof quota.check, "undefined");
  assert((quota.unavailable?.reason ?? "").length > 0);
  assert(
    /rate-limit response headers/i.test(quota.unavailable?.reason ?? ""),
    "the reason should say MessageBird publishes no rate-limit headers",
  );
});
