import { assert, assertEquals } from "@std/assert";
import check from "../../health/service.ts";

Deno.test("service: no status page is invented — declared unavailable and informational", () => {
  assertEquals(check.kind, "service");
  assertEquals(check.severity, "informational");
  assert(/self-hosted/.test(check.unavailable?.reason ?? ""));
  assertEquals(check.check, undefined);
  assertEquals(check.network, undefined);
});
