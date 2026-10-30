import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import service from "../../health/service.ts";

test("service: declared absent, informational, with a reason and no hook", () => {
  assertEquals(service.severity, "informational");
  assert(service.unavailable?.reason.includes("status.maileroo.net"));
  assertEquals(service.check, undefined);
});
