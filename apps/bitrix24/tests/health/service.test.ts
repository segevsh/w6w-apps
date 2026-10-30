import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import service from "../../health/service.ts";

test("service: declared unavailable, informational severity", () => {
  assertEquals(service.check, undefined);
  assertEquals(service.severity, "informational");
  assert(service.unavailable, "service must declare `unavailable`");
  assert(service.unavailable!.reason.length > 0);
});
