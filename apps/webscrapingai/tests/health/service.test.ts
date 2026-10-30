import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import check from "../../health/service.ts";

test("service: declares there is no status feed, informationally", () => {
  assertEquals(check.key, "service");
  assertEquals(check.kind, "service");
  assertEquals(check.severity, "informational");
  assert(check.unavailable?.reason.includes("no status page"));
  assertEquals(check.check, undefined);
});
