import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("quota: declared unavailable, because the document publishes nothing to read", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.covers, ["*"]);
  assertEquals(typeof quota.check, "undefined");
  assert(quota.unavailable !== undefined);
  assert(
    /no rate-limit response header/i.test(quota.unavailable!.reason),
    quota.unavailable!.reason,
  );
  assert(/429/.test(quota.unavailable!.reason), quota.unavailable!.reason);
});

/**
 * Load-bearing: an `unavailable` entry reports `unknown`, and `unknown` outranks
 * `ok`, so any other severity would pin this app's verdict at `unknown` forever.
 */
test("quota: the unavailable declaration is informational", () => {
  assertEquals(quota.severity, "informational");
});

test("quota: the reasoning names the search that found nothing", () => {
  assert(
    /ratelimit/.test(quota.unavailable!.reason) &&
      /retry-after/.test(quota.unavailable!.reason) &&
      /x-rate/.test(quota.unavailable!.reason),
    quota.unavailable!.reason,
  );
});
