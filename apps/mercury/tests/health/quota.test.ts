import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("quota: declares unavailable with a reason, never a check function", () => {
  assertEquals(typeof quota.check, "undefined");
  assert(typeof quota.unavailable?.reason === "string" && quota.unavailable.reason.length > 0);
});

test("quota: is informational — an unavailable entry always reports unknown, which outranks ok", () => {
  assertEquals(quota.severity, "informational");
});

test("quota: covers every connection", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.covers, ["*"]);
});
