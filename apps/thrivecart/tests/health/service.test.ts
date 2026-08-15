import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";

Deno.test("health/service: declared absent, informational, no check hook", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.check, undefined);
  assert(typeof service.unavailable?.reason === "string" && service.unavailable.reason.length > 0);
  assertEquals(service.severity, "informational");
});
