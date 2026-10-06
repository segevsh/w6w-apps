import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";

Deno.test("service: a declared absence at informational severity, with no probe", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.severity, "informational");
  assertEquals(service.check, undefined);
  assert(service.unavailable!.reason.includes("526"));
});
