import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("quota: declared as an informational, connection-scoped absence", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  assertEquals(quota.scope, "connection");
  assertEquals(quota.check, undefined);
  assertEquals(typeof quota.unavailable?.reason, "string");
});

/** The reasoning must actually be legible, not a placeholder string. */
test("quota: the reason names the rate-limits doc, not a made-up header", () => {
  assertEquals(
    quota.unavailable!.reason.includes("docs.goshippo.com/api-concepts/rate-limits"),
    true,
  );
  assertEquals(/PER-MINUTE/.test(quota.unavailable!.reason), true);
});
