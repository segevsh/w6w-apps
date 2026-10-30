import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import service from "../../health/service.ts";
import quota from "../../health/quota.ts";

for (const [name, h] of [["service", service], ["quota", quota]] as const) {
  test(`${name} health: declared unavailable at informational severity with a reason`, () => {
    assertEquals(h.key, name);
    assertEquals(h.severity, "informational");
    assert(h.unavailable && h.unavailable.reason.length > 20);
    assertEquals(h.check, undefined);
  });
}
