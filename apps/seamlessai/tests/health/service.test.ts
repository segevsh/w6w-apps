import { assertEquals } from "@std/assert";
import service from "../../health/service.ts";

Deno.test("service: declared unavailable at informational severity, with no hook", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.severity, "informational");
  assertEquals(typeof service.unavailable?.reason, "string");
  assertEquals(service.check, undefined);
  assertEquals(service.feed, undefined);
});
