import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";
import quota from "../../health/quota.ts";

for (const [name, h] of [["service", service], ["quota", quota]] as const) {
  Deno.test(`${name} health: declared unavailable at informational severity with a reason`, () => {
    assertEquals(h.key, name);
    assertEquals(h.severity, "informational");
    assert(h.unavailable && h.unavailable.reason.length > 20);
    assertEquals(h.check, undefined);
  });
}
