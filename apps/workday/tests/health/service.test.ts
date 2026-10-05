import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";

Deno.test("service: a declared absence, informational, with a verified reason", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.severity, "informational");
  assertEquals(service.check, undefined);
  assert(/login-gated/.test(service.unavailable!.reason));
  assert(/community\.workday\.com\/trust\/status/.test(service.unavailable!.reason));
});
