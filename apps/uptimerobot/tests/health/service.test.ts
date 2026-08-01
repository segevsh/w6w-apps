import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";

Deno.test("service: declares an honest absence rather than a fake check", () => {
  assertEquals(service.kind, "service");
  assert(service.unavailable, "no vendor status feed was found, so this must be unavailable");
  assert(service.unavailable!.reason.length > 0);
  assertEquals(service.check, undefined);
});
