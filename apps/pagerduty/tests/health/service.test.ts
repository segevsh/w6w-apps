import { assertEquals, assertExists } from "@std/assert";
import service from "../../health/service.ts";

Deno.test("service: declared unavailable — no verifiable machine-readable status API", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.check, undefined);
  assertExists(service.unavailable);
  assertEquals(typeof service.unavailable?.reason, "string");
  assertEquals((service.unavailable?.reason.length ?? 0) > 0, true);
});
