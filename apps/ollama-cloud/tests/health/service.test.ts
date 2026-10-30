import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import check from "../../health/service.ts";

test("service: no status page is invented — declared unavailable and informational", () => {
  assertEquals(check.kind, "service");
  assertEquals(check.severity, "informational");
  assert(/no machine-readable status feed/.test(check.unavailable?.reason ?? ""));
  assert(/instance/.test(check.unavailable?.reason ?? ""));
  assertEquals(check.check, undefined);
  assertEquals(check.feed, undefined);
  assertEquals(check.network, undefined);
});
