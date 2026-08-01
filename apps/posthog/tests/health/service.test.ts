import { assertEquals } from "@std/assert";
import service from "../../health/service.ts";

Deno.test("service: declared unavailable, not a fake probe", () => {
  assertEquals(service.key, "service");
  assertEquals(service.kind, "service");
  assertEquals(service.severity, "informational");
  assertEquals(service.check, undefined);
  assertEquals(typeof service.unavailable?.reason, "string");
  assertEquals((service.unavailable?.reason.length ?? 0) > 0, true);
});
