import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import service from "../../health/service.ts";

test("health/service: declared unavailable, informational", () => {
  assertEquals(service.kind, "service");
  assertEquals(typeof service.check, "undefined");
  assert((service.unavailable?.reason?.length ?? 0) > 0);
  assertEquals(service.severity, "informational");
});
