import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("quota: is a declared absence, not a probe", () => {
  assertEquals(typeof quota.check, "undefined");
  assert((quota.unavailable?.reason ?? "").length > 0);
});

test("quota: is informational, not the kind default", () => {
  assertEquals(quota.severity, "informational");
});

test("quota: names the documented ceilings, so the absence is falsifiable", () => {
  const reason = quota.unavailable?.reason ?? "";
  assert(/40 reads\/s/.test(reason), reason);
  assert(/30 writes\/s/.test(reason), reason);
});
