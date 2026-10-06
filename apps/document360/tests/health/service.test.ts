import { assertEquals } from "@std/assert";
import service from "../../health/service.ts";

Deno.test("service: a declared absence at informational severity, with no hook", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.severity, "informational");
  assertEquals(service.check, undefined);
  assertEquals(typeof service.unavailable?.reason, "string");
});
