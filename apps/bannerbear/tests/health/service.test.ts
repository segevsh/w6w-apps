import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import service from "../../health/service.ts";

test("health/service: declared unavailable, not a live check", () => {
  assertEquals(typeof service.check, "undefined");
  assert(service.unavailable, "expected an unavailable declaration");
  assert(service.unavailable!.reason.length > 0);
});

/**
 * `unknown` outranks `ok` in the roll-up, so at any severity but
 * `informational` a permanent declared absence would pin the whole App there
 * forever.
 */
test("health/service: severity is informational", () => {
  assertEquals(service.severity, "informational");
});

test("health/service: needs no credential", () => {
  assertEquals(service.credential, "none");
});
