import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";

Deno.test("service: a declared absence at informational severity, with no hook", () => {
  assertEquals(service.severity, "informational");
  assert(service.unavailable?.reason.includes("status.linkupapi.com"));
  assertEquals(service.check, undefined);
});
