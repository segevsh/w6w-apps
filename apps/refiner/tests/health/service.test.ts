import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import service from "../../health/service.ts";

test("health/service: declared unavailable at informational severity, with no hook", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.severity, "informational");
  assertEquals(service.check, undefined);
  assert(/status\.refiner\.io/.test(service.unavailable!.reason));
  assertEquals(service.network, undefined);
});
