import { assert, assertEquals } from "@std/assert";
import check from "../../health/quota.ts";

Deno.test("quota: is a declared absence with informational severity and no hook", () => {
  assertEquals(check.kind, "quota");
  assertEquals(check.severity, "informational");
  assertEquals(check.check, undefined);
  assert(check.unavailable!.reason.includes("5 requests per 10 seconds"));
});
