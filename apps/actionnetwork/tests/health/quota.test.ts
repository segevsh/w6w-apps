import { assert, assertEquals } from "@std/assert";
import check from "../../health/quota.ts";

Deno.test("quota: declares there is no rate-limit signal, informationally", () => {
  assertEquals(check.key, "quota");
  assertEquals(check.kind, "quota");
  assertEquals(check.severity, "informational");
  assert(check.unavailable && check.unavailable.reason.length > 0);
  assertEquals(check.check, undefined);
});
