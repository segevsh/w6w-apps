import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: declared unavailable, informational, with no check hook", () => {
  assertEquals(quota.severity, "informational");
  assert(quota.unavailable?.reason.includes("consumes characters"));
  assertEquals(quota.check, undefined);
});
