import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("quota: declares that no readable headroom exists", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.key, "quota");
  assertEquals(quota.check, undefined);
  assertEquals(quota.unavailable !== undefined, true);
});

test("quota: informational severity keeps a roll-up off a permanent unknown", () => {
  assertEquals(quota.severity, "informational");
});

test("quota: the reason names the two headers noCRM only sets on a 429", () => {
  const reason = quota.unavailable?.reason ?? "";
  assertEquals(reason.includes("API-RETRY-AFTER"), true);
  assertEquals(reason.includes("API-LIMIT-RESET"), true);
});
