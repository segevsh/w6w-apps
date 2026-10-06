import { assertEquals } from "@std/assert";
import check from "../../health/service.ts";

Deno.test("service: is a declared absence at informational severity", () => {
  assertEquals(check.kind, "service");
  assertEquals(check.severity, "informational");
  assertEquals(check.check, undefined);
  assertEquals(typeof check.unavailable?.reason, "string");
});
