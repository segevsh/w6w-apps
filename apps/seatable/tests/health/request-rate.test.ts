import { assert, assertEquals } from "@std/assert";
import requestRate from "../../health/request-rate.ts";

Deno.test("request-rate: is a declared absence with informational severity and no hook", () => {
  assertEquals(requestRate.kind, "quota");
  assertEquals(requestRate.severity, "informational");
  assertEquals(requestRate.check, undefined);
  assert(requestRate.unavailable?.reason.includes("200/minute"));
});
