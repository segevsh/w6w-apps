import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";

Deno.test("service: a declared absence with informational severity and no hook", () => {
  assertEquals(service.severity, "informational");
  assertEquals(service.kind, "service");
  assert(service.unavailable?.reason.includes("example"));
  assertEquals(service.check, undefined);
});
