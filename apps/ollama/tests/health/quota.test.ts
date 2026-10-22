import { assert, assertEquals } from "@std/assert";
import check from "../../health/quota.ts";

/** Without `informational` the app would sit at `unknown` forever. */
Deno.test("quota: declared unavailable with a reason, and informational", () => {
  assertEquals(check.kind, "quota");
  assertEquals(check.severity, "informational");
  assert((check.unavailable?.reason ?? "").length > 40);
  assertEquals(check.check, undefined);
});
