import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";

Deno.test("service: declared absent, informational, with a reason and no hook", () => {
  assertEquals(service.severity, "informational");
  assert(service.unavailable?.reason.includes("status.maileroo.net"));
  assertEquals(service.check, undefined);
});
