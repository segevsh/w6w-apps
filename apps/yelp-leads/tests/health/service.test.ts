import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import service from "../../health/service.ts";

test("service: is a declared absence, informational severity", () => {
  assertEquals(typeof service.check, "undefined");
  assert(service.unavailable?.reason.length ?? 0 > 0);
  assertEquals(service.severity, "informational");
});

test("service: covers the whole app", () => {
  assertEquals(service.covers, ["*"]);
});
