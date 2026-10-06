import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: declares an informational absence with a reason and no hook", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  assert(quota.unavailable!.reason.includes("100 requests/minute"));
  assertEquals((quota as { check?: unknown }).check, undefined);
});
