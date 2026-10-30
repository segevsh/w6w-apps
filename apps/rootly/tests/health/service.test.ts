import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import service from "../../health/service.ts";

test("service health: declared unavailable with a reason, informational, no hook", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.severity, "informational");
  assert(service.unavailable!.reason.includes("Cloudflare"));
  assertEquals(service.check, undefined);
});
