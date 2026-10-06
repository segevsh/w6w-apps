import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";

Deno.test("service: declared unavailable, informational, with a reason and no hook", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.severity, "informational");
  assert(service.unavailable?.reason.includes("inactive"));
  assertEquals(service.check, undefined);
});
