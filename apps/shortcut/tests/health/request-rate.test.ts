import { assert, assertEquals } from "@std/assert";
import requestRate from "../../health/request-rate.ts";

Deno.test("request-rate: is a declared absence, not a live probe", () => {
  assertEquals(typeof requestRate.check, "undefined");
  assertEquals(typeof requestRate.unavailable?.reason, "string");
  assert((requestRate.unavailable?.reason.length ?? 0) > 0);
});

/**
 * `unavailable` always reports `unknown`, which outranks `ok` in the roll-up —
 * at any severity but `informational` this would pin the app's health verdict
 * at `unknown` forever.
 */
Deno.test("request-rate: severity is informational", () => {
  assertEquals(requestRate.severity, "informational");
});
