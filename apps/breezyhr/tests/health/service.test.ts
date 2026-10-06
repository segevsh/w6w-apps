import { assertEquals } from "@std/assert";
import service from "../../health/service.ts";

Deno.test("service: a declared absence, informational, with no hook", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.severity, "informational");
  assertEquals(typeof service.unavailable?.reason, "string");
  assertEquals(service.check, undefined);
});
