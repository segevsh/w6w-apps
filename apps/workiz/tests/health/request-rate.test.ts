import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import requestRate from "../../health/request-rate.ts";

/**
 * The request-rate dimension is a declared absence, not a missed probe: Workiz
 * returns no `X-RateLimit-*` headers and documents no limits endpoint.
 */
test("request-rate: declares the absence instead of probing", () => {
  assertEquals(requestRate.kind, "quota");
  assertEquals(requestRate.covers, ["*"]);
  assertEquals(requestRate.severity, "informational");
  assertEquals(requestRate.check, undefined);
  assert(typeof requestRate.unavailable?.reason === "string");
});

test("request-rate: the reason names both verified absences", () => {
  const reason = requestRate.unavailable?.reason ?? "";
  assert(/X-RateLimit/.test(reason), "the missing headers are not named");
  assert(/quota endpoint|limits .*endpoint|no account, usage, limits/i.test(reason), reason);
});

/** Nothing here may reach the network — there is nothing to probe. */
test("request-rate: declares no egress", () => {
  assertEquals(requestRate.network, undefined);
});

/**
 * `unavailable` always reports `unknown`, and `unknown` outranks `ok`, so at
 * `degraded` or `fatal` this check would pin the whole app at `unknown` forever.
 */
test("request-rate: informational is what keeps the declaration harmless", () => {
  assertEquals(requestRate.severity, "informational");
});
