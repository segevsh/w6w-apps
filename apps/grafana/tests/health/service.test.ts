import { assertEquals } from "@std/assert";
import service from "../../health/service.ts";

Deno.test("service: declared absent, informational, no check hook", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.severity, "informational");
  assertEquals(service.check, undefined);
  assertEquals(typeof service.unavailable?.reason, "string");
});
