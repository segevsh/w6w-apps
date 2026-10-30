import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import service from "../../health/service.ts";

test("service: declared unavailable, informational, and undeclared as a live check", () => {
  assertEquals(service.check, undefined);
  assertEquals(service.severity, "informational");
  assert(!!service.unavailable?.reason);
  assert(service.unavailable!.reason.includes("404"));
});
