import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";
import quota from "../../health/quota.ts";

for (
  const [name, check, kind] of [["service", service, "service"], ["quota", quota, "quota"]] as const
) {
  Deno.test(`${name}: is a declared absence at informational severity with no hook`, () => {
    assertEquals(check.kind, kind);
    assertEquals(check.severity, "informational");
    assert((check.unavailable?.reason ?? "").length > 20);
    assertEquals(check.check, undefined);
    assertEquals(check.feed, undefined);
  });
}
