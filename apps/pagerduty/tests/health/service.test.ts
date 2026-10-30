import { test } from "node:test";
import { assertEquals, assertExists } from "../_assert.ts";
import service from "../../health/service.ts";

test("service: declared unavailable — no verifiable machine-readable status API", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.check, undefined);
  assertExists(service.unavailable);
  assertEquals(typeof service.unavailable?.reason, "string");
  assertEquals((service.unavailable?.reason.length ?? 0) > 0, true);
});
