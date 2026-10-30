import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import service from "../../health/service.ts";

test("service: declared unavailable and informational — self-hosted software has no vendor status", () => {
  assertEquals(service.check, undefined);
  assert((service.unavailable?.reason.length ?? 0) > 0);
  assertEquals(service.severity, "informational");
});
