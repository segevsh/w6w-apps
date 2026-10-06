import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: declared unavailable with a reason, informational severity, no check hook", () => {
  assertEquals(quota.severity, "informational");
  assert(quota.unavailable?.reason.length);
  assertEquals(quota.check, undefined);
});
