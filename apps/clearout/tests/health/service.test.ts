import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";

Deno.test("service: a declared absence, informational, with no hook", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.severity, "informational");
  assert(service.unavailable?.reason.includes("status.clearout.io"));
  assertEquals(service.check, undefined);
});
