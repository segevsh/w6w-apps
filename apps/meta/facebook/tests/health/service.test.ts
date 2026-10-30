import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import service from "../../health/service.ts";

test("health/service: declared unavailable, informational so it never worsens a roll-up", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.check, undefined);
  assertEquals(service.severity, "informational");
  assertEquals(typeof service.unavailable?.reason, "string");
  assertEquals((service.unavailable?.reason.length ?? 0) > 0, true);
});
