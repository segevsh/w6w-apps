import { test } from "node:test";
import { assert, assertEquals, assertStringIncludes } from "../_assert.ts";
import service from "../../health/service.ts";

test("health/service: is declared absent rather than left as a gap", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.check, undefined);
  assert(service.unavailable);
  assertStringIncludes(service.unavailable!.reason, "metastatus.com");
});

test("health/service: declares no feed — Meta publishes none", () => {
  assertEquals(service.feed, undefined);
});

test("health/service: is informational, so a permanent unknown cannot pin the verdict", () => {
  assertEquals(service.severity, "informational");
  assertEquals(service.covers, ["*"]);
});
