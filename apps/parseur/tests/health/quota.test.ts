import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: is a declared absence, not a live probe", () => {
  assertEquals(typeof quota.check, "undefined");
  assertEquals(typeof quota.unavailable?.reason, "string");
  assert(quota.unavailable!.reason.length > 0);
});

Deno.test("quota: is informational so it never pins the app's verdict at unknown", () => {
  assertEquals(quota.severity, "informational");
});
