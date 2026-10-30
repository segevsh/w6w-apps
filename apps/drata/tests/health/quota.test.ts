import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("quota: declares itself unavailable at informational severity", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  assert((quota.unavailable?.reason ?? "").includes("500 requests per minute"));
});
