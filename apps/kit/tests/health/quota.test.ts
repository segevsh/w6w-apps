import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: declared absent, informational, no check hook", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  assertEquals(quota.check, undefined);
  assertEquals(typeof quota.unavailable?.reason, "string");
});

Deno.test("quota: the reason names what is missing rather than gesturing at it", () => {
  const reason = quota.unavailable!.reason;
  assert(/rate-limit response headers/i.test(reason), "should say headers are the gap");
  assert(/120/.test(reason), "should cite the documented allowance it could not read live");
});
