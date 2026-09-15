import { assertEquals } from "@std/assert";
import requestRate from "../../health/request-rate.ts";

Deno.test("request-rate: declared unavailable, informational, no check hook", () => {
  assertEquals(requestRate.check, undefined);
  assertEquals(requestRate.severity, "informational");
  assertEquals(typeof requestRate.unavailable?.reason, "string");
  assertEquals((requestRate.unavailable?.reason.length ?? 0) > 0, true);
});
