import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import rateLimit from "../../health/rate-limit.ts";

test("health/rate-limit: declared unavailable, no check hook", () => {
  assertEquals(typeof rateLimit.check, "undefined");
  assertEquals(typeof rateLimit.unavailable?.reason, "string");
  assertEquals(rateLimit.unavailable!.reason.length > 0, true);
});

test("health/rate-limit: informational severity so it never pins the app at unknown", () => {
  assertEquals(rateLimit.severity, "informational");
});

test("health/rate-limit: kind quota, covers everything", () => {
  assertEquals(rateLimit.kind, "quota");
  assertEquals(rateLimit.covers, ["*"]);
});
