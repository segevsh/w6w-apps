import { assert, assertEquals } from "@std/assert";
import check from "../../health/service.ts";

Deno.test("service: a declared absence, informational, with a reason and no hook", () => {
  assertEquals(check.severity, "informational");
  assert(check.unavailable?.reason);
  assertEquals(check.check, undefined);
});
