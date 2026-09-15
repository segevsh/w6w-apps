import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";

Deno.test("service: is a declared absence, not a live probe", () => {
  assertEquals(typeof service.check, "undefined");
  assertEquals(typeof service.unavailable?.reason, "string");
  assert(service.unavailable!.reason.length > 0);
});

Deno.test("service: is informational so it never pins the app's verdict at unknown", () => {
  assertEquals(service.severity, "informational");
});
