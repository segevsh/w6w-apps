import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import service from "../../health/service.ts";

test("service: declared unavailable, not a live check", () => {
  assertEquals(typeof service.check, "undefined");
  assert(typeof service.unavailable?.reason === "string" && service.unavailable.reason.length > 0);
});

test("service: informational severity, so the permanent unknown never pins the verdict", () => {
  assertEquals(service.severity, "informational");
});

test("service: unsigned — no credential ever reaches a status probe that doesn't exist", () => {
  assertEquals(service.credential, "none");
});
