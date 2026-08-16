import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";

Deno.test("service: declared absence, not a live probe", () => {
  assertEquals(service.key, "service");
  assertEquals(service.kind, "service");
  assertEquals(service.check, undefined);
  assert(typeof service.unavailable?.reason === "string" && service.unavailable.reason.length > 0);
});

Deno.test("service: informational — an unavailable check must never outrank ok in the roll-up", () => {
  assertEquals(service.severity, "informational");
});
