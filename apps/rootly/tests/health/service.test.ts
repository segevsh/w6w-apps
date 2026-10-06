import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";

Deno.test("service health: declared unavailable with a reason, informational, no hook", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.severity, "informational");
  assert(service.unavailable!.reason.includes("Cloudflare"));
  assertEquals(service.check, undefined);
});
