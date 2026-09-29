import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";

/**
 * An `unavailable` entry always reports `unknown`, and `unknown` outranks
 * `ok` in the roll-up, so any severity but `informational` would pin this
 * App's platform-status verdict at `unknown` forever.
 */
Deno.test("service: is a declared absence at informational severity", () => {
  assertEquals(service.severity, "informational");
  assertEquals(typeof service.check, "undefined");
  assert((service.unavailable?.reason ?? "").length > 0);
});

/** The reason names both sources checked, and why neither is trusted. */
Deno.test("service: the reason names both status surfaces investigated", () => {
  const reason = service.unavailable?.reason ?? "";
  assert(/status\.wappalyzer\.com/.test(reason));
  assert(/wappalyzer\.statuspage\.io/i.test(reason));
});
