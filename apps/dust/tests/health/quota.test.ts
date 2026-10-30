import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("quota: declared unavailable at informational severity, no check hook", () => {
  assertEquals(quota.check, undefined);
  assertEquals(quota.severity, "informational");
  assert(quota.unavailable, "expected an unavailable reason");
});

test("quota: the reason cites both of the vendor's documented (unreadable) ceilings", () => {
  const reason = quota.unavailable?.reason ?? "";
  assert(/120/.test(reason), reason);
  assert(/10,000/.test(reason), reason);
});
