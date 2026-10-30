import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import service from "../../health/service.ts";

test("service: declared unavailable at informational severity, with no hook or feed", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.severity, "informational");
  assert(service.unavailable?.reason.includes("status.inoreader.com"));
  assertEquals(service.check, undefined);
  assertEquals(service.feed, undefined);
});
