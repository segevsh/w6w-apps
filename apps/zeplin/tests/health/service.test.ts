import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import service from "../../health/service.ts";

test("service health: declared unavailable, informational, with a reason and no hook", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.severity, "informational");
  assertEquals(service.check, undefined);
  assertEquals(typeof service.unavailable?.reason, "string");
  assertEquals(service.network, undefined);
});
