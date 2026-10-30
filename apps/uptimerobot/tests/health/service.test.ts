import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import service from "../../health/service.ts";

test("service: declares an honest absence rather than a fake check", () => {
  assertEquals(service.kind, "service");
  assert(service.unavailable, "no vendor status feed was found, so this must be unavailable");
  assert(service.unavailable!.reason.length > 0);
  assertEquals(service.check, undefined);
});
