import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";

Deno.test("service: is a declared absence, not a probe", () => {
  assertEquals(typeof service.check, "undefined");
  assert((service.unavailable?.reason ?? "").length > 0);
});

/**
 * An `unavailable` entry always reports `unknown`, and `unknown` outranks `ok`
 * in a roll-up, so any severity but `informational` would pin this app's
 * verdict at `unknown` forever.
 */
Deno.test("service: is informational, not the kind default", () => {
  assertEquals(service.severity, "informational");
});

Deno.test("service: names the vendor paths checked, so the absence is falsifiable", () => {
  const reason = service.unavailable?.reason ?? "";
  assert(/statuspage\.io/i.test(reason), reason);
  assert(/404/.test(reason), reason);
});
