import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";

Deno.test("health/service: declared unavailable at informational severity, with no hook", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.severity, "informational");
  assertEquals(service.check, undefined);
  assert(/status\.refiner\.io/.test(service.unavailable!.reason));
  assertEquals(service.network, undefined);
});
