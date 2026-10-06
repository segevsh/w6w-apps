import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";

Deno.test("service: declared unavailable at informational severity, with no hook or feed", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.severity, "informational");
  assert(service.unavailable?.reason.includes("status.inoreader.com"));
  assertEquals(service.check, undefined);
  assertEquals(service.feed, undefined);
});
