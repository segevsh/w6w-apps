import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("quota: declared unavailable, informational, no check hook", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.check, undefined);
  assertEquals(quota.severity, "informational");
  assert((quota.unavailable?.reason ?? "").length > 0);
});

test("quota: the reason names the published ceilings and the 429 signal", () => {
  const reason = quota.unavailable!.reason;
  assert(reason.includes("429"));
  assert(reason.includes("no headroom endpoint"));
});
