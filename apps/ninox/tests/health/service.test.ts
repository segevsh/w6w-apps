import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";

Deno.test("service health: a declared absence at informational severity", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.severity, "informational");
  assert(service.unavailable?.reason);
  assertEquals(service.check, undefined);
});
