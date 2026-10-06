import { assertEquals } from "@std/assert";
import service from "../../health/service.ts";

Deno.test("service health: declared unavailable, informational, with a reason and no hook", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.severity, "informational");
  assertEquals(service.check, undefined);
  assertEquals(typeof service.unavailable?.reason, "string");
  assertEquals(service.network, undefined);
});
