import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import service from "../../health/service.ts";

test("service: is a declared absence, not a probe", () => {
  assertEquals(typeof service.check, "undefined");
  assert((service.unavailable?.reason ?? "").length > 0);
});

/**
 * An `unavailable` entry always reports `unknown`, and `unknown` outranks `ok`
 * in a roll-up, so any severity but `informational` would pin this app's
 * verdict at `unknown` forever.
 */
test("service: is informational, not the kind default", () => {
  assertEquals(service.severity, "informational");
});

test("service: names the vendor paths checked, so the absence is falsifiable", () => {
  const reason = service.unavailable?.reason ?? "";
  assert(/statuspage\.io/i.test(reason), reason);
  assert(/404/.test(reason), reason);
});
