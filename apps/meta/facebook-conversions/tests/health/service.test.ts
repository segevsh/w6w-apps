import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import service from "../../health/service.ts";

Deno.test("health/service: is declared absent rather than left as a gap", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.check, undefined);
  assert(service.unavailable);
  assertStringIncludes(service.unavailable!.reason, "metastatus.com");
});

Deno.test("health/service: declares no feed — Meta publishes none", () => {
  assertEquals(service.feed, undefined);
});

Deno.test("health/service: is informational, so a permanent unknown cannot pin the verdict", () => {
  assertEquals(service.severity, "informational");
  assertEquals(service.covers, ["*"]);
});
