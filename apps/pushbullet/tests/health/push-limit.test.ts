import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import pushLimit from "../../health/push-limit.ts";

test("push-limit: declared unavailable, not probed", () => {
  assertEquals(typeof pushLimit.check, "undefined");
  assert(pushLimit.unavailable?.reason && pushLimit.unavailable.reason.length > 0);
});

test("push-limit: is informational", () => {
  assertEquals(pushLimit.severity, "informational");
});

test("push-limit: is a distinct question from rate-limit headroom", () => {
  assert(/500/.test(pushLimit.unavailable!.reason));
  assert(/rate-limit/.test(pushLimit.unavailable!.reason));
});
