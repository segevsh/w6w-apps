import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import check from "../../health/service.ts";

test("service: no status page is invented — declared unavailable and informational", () => {
  assertEquals(check.kind, "service");
  assertEquals(check.severity, "informational");
  assert(/self-hosted/.test(check.unavailable?.reason ?? ""));
  assertEquals(check.check, undefined);
  assertEquals(check.network, undefined);
});
