import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";

Deno.test("service: declares a vendor-status absence at informational severity, with no hook", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.severity, "informational");
  assert(service.unavailable?.reason.includes("status"));
  assertEquals(service.check, undefined);
});
