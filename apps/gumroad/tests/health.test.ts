import { assertEquals } from "@std/assert";
import service from "../health/service.ts";
import quota from "../health/quota.ts";

for (const [name, check] of [["service", service], ["quota", quota]] as const) {
  Deno.test(`health: ${name} is a declared absence with informational severity`, () => {
    assertEquals(check.key, name);
    assertEquals(check.severity, "informational");
    assertEquals(typeof check.unavailable?.reason, "string");
    assertEquals(check.check, undefined);
  });
}

Deno.test("health: the absences name what was checked, not just 'unavailable'", () => {
  assertEquals(service.unavailable!.reason.includes("status.gumroad.com"), true);
  assertEquals(service.kind, "service");
  assertEquals(quota.kind, "quota");
});
